# Google Sheets Sync

## Overview

The system automatically syncs data from Google Sheets every 10 minutes:
- **Issues** from 5 sources (LV, CS, Block, CDT_CW, QA)
- **Returns** from Returns tracker sheet

Each sync updates existing records and inserts new ones based on row hash.

## Data Sources

### Issues Sources

| Source | Sheet ID | GID | Description |
|--------|----------|-----|-------------|
| LV | 1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I | 0 | LV team issues |
| CS | 1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0 | 0 | CS team issues |
| Block | 13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE | 0 | Block team issues |
| CDT_CW | 1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM | 0 | CDT/CW issues |
| QA | 1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0 | 1250110979 | QA reported issues |

### Returns Source

| Source | Sheet ID | GID | Description |
|--------|----------|-----|-------------|
| Returns | 1Gc0rpsOjmvUjpVgmdfbfsP4elRFpOL6GMJYjkuJyU2s | 1928916845 | Lead returns tracker |

## Google Service Account Setup

### 1. Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable Google Sheets API
4. Go to IAM & Admin → Service Accounts
5. Create new service account
6. Generate JSON key

### 2. Share Sheets with Service Account

For each Google Sheet:
1. Open the sheet
2. Click "Share"
3. Add service account email (e.g., `sa@project.iam.gserviceaccount.com`)
4. Give "Viewer" permission

### 3. Configure Environment

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvg...\n-----END PRIVATE KEY-----\n"
```

**Note:** The private key must have `\n` for line breaks, not actual newlines.

## Column Mappings

Different sheets may have different column names. The sync service normalizes them:

```typescript
const COLUMN_MAPPINGS = {
  issue_date: ['date', 'issue_date', 'дата', 'data'],
  responsible_cc_name: ['cc', 'responsible', 'cc_name', 'responsible_cc', 'ответственный', 'сотрудник'],
  cid: ['cid', 'client_id', 'customer_id', 'id_клиента'],
  issue_type: ['issue', 'type', 'issue_type', 'тип', 'тип_ошибки', 'error_type'],  // 'issue' first for LV source
  comment: ['comment', 'comments', 'комментарий', 'примечание', 'note', 'notes'],
  issue_rate: ['rate', 'issue_rate', 'severity', 'критичность', 'оценка'],
  issue_category: ['category', 'issue_category', 'категория', 'тип_клиент'],
  reported_by: ['reported_by', 'reporter', 'qa', 'проверяющий'],
  task_id: ['task_id', 'task', 'ticket', 'тикет', 'задача'],
};
```

The sync service tries each alias in order until it finds a match.

**Note:** `issue` is listed first in `issue_type` because LV source uses `issue` column for descriptions, while QA uses `issue_type`.

## Date Parsing

The service handles multiple date formats:

| Format | Example | Notes |
|--------|---------|-------|
| ISO | 2024-01-15 | Standard format |
| US (MM/DD/YYYY) | 1/15/2024 | Google Sheets default |
| EU (DD.MM.YYYY) | 15.01.2024 | European format |

```typescript
function parseDate(value: string): string | null {
  // ISO: 2024-01-15
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(value)) { ... }

  // US: 1/15/2024
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) { ... }

  // EU: 15.01.2024
  if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) { ... }

  // Fallback to native Date parsing
  return new Date(value).toISOString().split('T')[0];
}
```

## Sync Process

### Flow

```
1. Cron triggers sync (every 10 min)
        │
        ▼
2. ISSUES SYNC:
   Get active sources from issue_sources table
        │
        ▼
3. For each source:
   ┌────────────────────────────────────────┐
   │ a. Create sync_log (status=running)    │
   │ b. Fetch data from Google Sheets       │
   │ c. For each row:                       │
   │    - Parse date (skip if invalid)      │
   │    - Check CC name (skip if empty)     │  ← Prevents "Unknown" entries
   │    - Normalize column names            │
   │    - Generate row hash                 │
   │    - Upsert into issues table          │
   │ d. Link CC names to users              │
   │ e. Update sync_log (status=success)    │
   └────────────────────────────────────────┘
        │
        ▼
4. RETURNS SYNC:
   ┌────────────────────────────────────────┐
   │ a. Fetch data from Returns sheet       │
   │ b. For each row:                       │
   │    - Parse return date                 │
   │    - Check initial_returns_number > 0  │
   │    - Parse CC reasons (CC: prefix)     │
   │    - Link CC abbreviation to user      │
   │    - Upsert into returns table         │
   └────────────────────────────────────────┘
        │
        ▼
5. Done
```

### Skip Logic

Rows are **skipped** (not imported) if:
- Date is missing or invalid
- Responsible CC name is empty (prevents "Unknown" entries when QA hasn't finished filling data)

### Deduplication

Each row is identified by a SHA256 hash of **key fields only**:

```typescript
function generateRowHash(row: Record<string, string>, sourceId: number): string {
  // Hash based on: sourceId + CID + Date + CC Name
  const cid = findColumnValue(row, COLUMN_MAPPINGS.cid) || '';
  const date = findColumnValue(row, COLUMN_MAPPINGS.issue_date) || '';
  const cc = findColumnValue(row, COLUMN_MAPPINGS.responsible_cc_name) || '';

  const keyStr = `${sourceId}|${cid.toLowerCase().trim()}|${date.trim()}|${cc.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(keyStr).digest('hex').substring(0, 64);
}
```

**Why key fields only?**
- Allows updates to non-key fields (comment, rate, category) without creating duplicates
- If someone edits a comment in Google Sheets, the next sync will UPDATE the existing record
- Only changes to CID, Date, or CC Name create new records

The `(source_id, external_row_hash)` unique constraint prevents duplicates.

### User Linking

After sync, CC names are linked to user accounts:

```sql
UPDATE issues i
SET responsible_cc_id = u.id
FROM users u
WHERE i.responsible_cc_id IS NULL
  AND i.responsible_cc_name IS NOT NULL
  AND LOWER(TRIM(i.responsible_cc_name)) = LOWER(TRIM(u.full_name));
```

## Manual Sync

### Via API

```bash
# Trigger sync for all sources
curl -X POST http://localhost:3000/api/sync/trigger

# Check status
curl http://localhost:3000/api/sync/status

# View logs
curl http://localhost:3000/api/sync/logs?limit=10
```

### Via Admin Panel

1. Go to Admin → Sync Status
2. Click "Trigger Sync" button
3. View progress in logs table

## Troubleshooting

### Sync Fails Immediately

**Check credentials:**
```bash
# Test Google Sheets API
curl -X GET "https://sheets.googleapis.com/v4/spreadsheets/SHEET_ID/values/Sheet1" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

**Check environment variables:**
- Ensure `GOOGLE_SERVICE_ACCOUNT_EMAIL` is set
- Ensure `GOOGLE_PRIVATE_KEY` has proper escaping

### Rows Not Importing

**Check date column:**
- Rows without valid dates are skipped
- Check sync logs for "skipped" count

**Check CC name:**
- Rows without Responsible CC name are skipped
- This prevents "Unknown" entries when QA hasn't finished filling data

**Check column names:**
- Verify column headers match mappings
- Add new aliases to `COLUMN_MAPPINGS` if needed

### "Unknown" Entries Appearing

If issues appear with "Unknown" CC name:
1. This shouldn't happen anymore (fixed in v1.3.1)
2. Delete existing Unknown entries:
   ```sql
   DELETE FROM issues WHERE responsible_cc_name IS NULL OR responsible_cc_name = '';
   ```
3. Verify sync service has the skip logic for empty CC names

### Users Not Linked

**Check name matching:**
```sql
-- Find unlinked issues
SELECT DISTINCT responsible_cc_name
FROM issues
WHERE responsible_cc_id IS NULL
  AND responsible_cc_name IS NOT NULL;

-- Compare with users
SELECT full_name FROM users WHERE is_active = true;
```

**Fix mismatches:**
- Update user's `full_name` to match sheet
- Or update sheet to match user name

### High Memory Usage

**Large sheets:**
- Process in batches if sheet has 10k+ rows
- Consider archiving old data

### Rate Limits

Google Sheets API has limits:
- 100 requests per 100 seconds per user
- 500 requests per 100 seconds per project

If hitting limits:
- Increase sync interval
- Cache responses
- Use batch requests

## Adding New Source

### 1. Create Google Sheet

Set up the sheet with columns:
- date (required)
- cc / responsible (required)
- type / issue_type
- comment
- rate (1-3)
- category (client/internal)
- reported_by
- task_id
- cid

### 2. Share with Service Account

Share with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as Viewer.

### 3. Add to Database

```sql
INSERT INTO issue_sources (name, display_name, google_sheet_id, sheet_gid)
VALUES ('NEW_SOURCE', 'New Source Display Name', 'SHEET_ID_HERE', '0');
```

### 4. Verify Sync

```bash
# Trigger sync
curl -X POST http://localhost:3000/api/sync/trigger

# Check logs
curl http://localhost:3000/api/sync/logs?limit=5
```

## Monitoring

### Sync Health Check

```sql
-- Last sync per source
SELECT
  s.name,
  MAX(sl.completed_at) as last_sync,
  EXTRACT(EPOCH FROM (NOW() - MAX(sl.completed_at)))/60 as minutes_ago
FROM issue_sources s
LEFT JOIN sync_logs sl ON s.id = sl.source_id AND sl.status = 'success'
GROUP BY s.name;

-- Failed syncs in last 24h
SELECT * FROM sync_logs
WHERE status = 'failed'
  AND started_at > NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC;
```

### Alerts

Consider setting up alerts for:
- No successful sync in last 30 minutes
- Multiple consecutive failures
- Sudden drop in rows_fetched

## Future Improvements

### Planned

1. **QA Source from PowerBI** - Waiting for BI team API access
2. **Team Roster from Bitrix24** - Waiting for API access
3. **Incremental Sync** - Only fetch rows modified since last sync
4. **Webhook Notifications** - Push updates instead of polling

### Potential

- Real-time sync via Google Sheets triggers
- Multi-sheet support per source
- Custom column mapping per source
- Data validation rules
