import { fetchSheetData } from '../config/google-sheets.js';
import { query } from '../config/database.js';
import crypto from 'crypto';

const RETURNS_SHEET_ID = '1Gc0rpsOjmvUjpVgmdfbfsP4elRFpOL6GMJYjkuJyU2s';
const RETURNS_GID = '1928916845';

export interface ReturnsSyncResult {
  rows_fetched: number;
  rows_with_cc_fault: number;
  rows_inserted: number;
  rows_updated: number;
  errors: string[];
}

interface ReturnReason {
  reason: string;
  count: number;
}

export async function syncReturns(): Promise<ReturnsSyncResult> {
  const result: ReturnsSyncResult = {
    rows_fetched: 0,
    rows_with_cc_fault: 0,
    rows_inserted: 0,
    rows_updated: 0,
    errors: [],
  };

  // Create sync log entry
  const logResult = await query(
    `INSERT INTO returns_sync_logs (started_at, status) VALUES (NOW(), 'running') RETURNING id`
  );
  const logId = logResult.rows[0].id;

  try {
    // Fetch data from Google Sheets
    console.log('Fetching Returns data from Google Sheets...');
    const data = await fetchSheetData(RETURNS_SHEET_ID, RETURNS_GID);
    result.rows_fetched = data.rows.length;
    console.log(`Fetched ${data.rows.length} rows, headers:`, data.headers);

    if (data.rows.length === 0) {
      await updateSyncLog(logId, 'success', result);
      return result;
    }

    // Build a map of CC abbreviations to user IDs
    const userMap = await buildUserAbbreviationMap();
    console.log(`Built user map with ${userMap.size} entries`);

    // Process each row
    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];

      try {
        // Parse CC Fault (can be 0 or empty - we store all rows now)
        const ccFault = parseInt(row.cc_fault || row.ccfault || '0', 10) || 0;

        // Count rows with CC fault for stats
        if (ccFault > 0) {
          result.rows_with_cc_fault++;
        }

        // Parse initial returns number (total returns in this row)
        const initialReturnsNumber = parseInt(row.initial_returns_number || row.initialreturnsnumber || '0', 10) || 0;

        // Skip rows with no returns data
        if (initialReturnsNumber <= 0) {
          continue;
        }

        // Parse return data
        const returnDate = parseDate(row.return_receive_date || row.returnreceivedate || '');
        if (!returnDate) {
          result.errors.push(`Row ${i + 2}: Invalid return date`);
          continue;
        }

        const clientName = row.client_name || row.clientname || '';
        const block = row.block || '';
        const cid = row.cid || '';
        const ccAbbreviation = (row.cc || '').trim().toUpperCase();
        const teamLeadName = row.tl_cm || row.tlcm || row.tl || '';

        // Find user by abbreviation
        const ccUserId = userMap.get(ccAbbreviation) || null;

        // Parse all CC Reason/Count pairs (from CC columns AND QC/CAT columns with "CC:" prefix)
        const reasons = parseReasons(row, data.headers);
        const totalLeads = reasons.reduce((sum, r) => sum + r.count, 0);

        // Generate hash for deduplication
        const hashSource = `${returnDate}|${clientName}|${cid}|${ccAbbreviation}|${JSON.stringify(reasons)}`;
        const rowHash = crypto.createHash('md5').update(hashSource).digest('hex');

        // Upsert into returns table
        const upsertResult = await query(
          `INSERT INTO returns (
            external_row_hash, return_date, client_name, block, cid,
            cc_abbreviation, cc_user_id, team_lead_name,
            reasons, total_leads, cc_fault, initial_returns_number, raw_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (external_row_hash) DO UPDATE SET
            return_date = EXCLUDED.return_date,
            client_name = EXCLUDED.client_name,
            block = EXCLUDED.block,
            cid = EXCLUDED.cid,
            cc_abbreviation = EXCLUDED.cc_abbreviation,
            cc_user_id = EXCLUDED.cc_user_id,
            team_lead_name = EXCLUDED.team_lead_name,
            reasons = EXCLUDED.reasons,
            total_leads = EXCLUDED.total_leads,
            cc_fault = EXCLUDED.cc_fault,
            initial_returns_number = EXCLUDED.initial_returns_number,
            raw_data = EXCLUDED.raw_data,
            updated_at = NOW()
          RETURNING (xmax = 0) as inserted`,
          [
            rowHash,
            returnDate,
            clientName,
            block,
            cid,
            ccAbbreviation || null,
            ccUserId,
            teamLeadName,
            JSON.stringify(reasons),
            totalLeads,
            ccFault,
            initialReturnsNumber,
            JSON.stringify(row),
          ]
        );

        if (upsertResult.rows[0]?.inserted) {
          result.rows_inserted++;
        } else {
          result.rows_updated++;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`Row ${i + 2}: ${message}`);
      }
    }

    await updateSyncLog(logId, 'success', result);
    console.log('Returns sync completed:', result);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Sync failed: ${message}`);
    await updateSyncLog(logId, 'failed', result, message);
    console.error('Returns sync failed:', err);
    return result;
  }
}

async function buildUserAbbreviationMap(): Promise<Map<string, number>> {
  const result = await query(
    `SELECT id, cc_abbreviation FROM users WHERE cc_abbreviation IS NOT NULL AND cc_abbreviation != ''`
  );

  const map = new Map<string, number>();
  for (const row of result.rows) {
    if (row.cc_abbreviation) {
      map.set(row.cc_abbreviation.toUpperCase(), row.id);
    }
  }
  return map;
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Google Sheets uses M/D/YYYY format (US format)
  const parts = dateStr.split(/[\/\-\.]/);

  if (parts.length === 3) {
    let year: number, month: number, day: number;

    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else if (parseInt(parts[1], 10) > 12) {
      // Second part > 12 means it's day, so format is M/D/YYYY
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      // Assume M/D/YYYY (US format - month first)
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    // Handle 2-digit year
    if (year < 100) {
      year += 2000;
    }

    if (year && month && day && month <= 12 && day <= 31) {
      return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }
  }

  // Try parsing as Date
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return null;
}

function parseReasons(row: Record<string, string>, headers: string[]): ReturnReason[] {
  const reasons: ReturnReason[] = [];

  // Look for cc_reason_1, cc_count_1, cc_reason_2, cc_count_2, etc.
  // Headers are normalized: cc_reason_1, cc_count_1, etc.
  for (let i = 1; i <= 10; i++) {
    const reasonKey = `cc_reason_${i}`;
    const countKey = `cc_count_${i}`;

    // Also try without underscore: ccreason1, cccount1
    const reasonKeyAlt = `ccreason${i}`;
    const countKeyAlt = `cccount${i}`;

    const reason = row[reasonKey] || row[reasonKeyAlt] || '';
    const countStr = row[countKey] || row[countKeyAlt] || '';
    const count = parseInt(countStr, 10) || 0;

    if (reason && reason.trim() && count > 0) {
      reasons.push({ reason: reason.trim(), count });
    }
  }

  // Also look for QC/CAT reasons that start with "CC:"
  // Headers: qc__cat_reason_1, qc__cat_count_1, etc.
  for (let i = 1; i <= 10; i++) {
    const reasonKey = `qc__cat_reason_${i}`;
    const countKey = `qc__cat_count_${i}`;

    // Also try alternative formats
    const reasonKeyAlt = `qc_cat_reason_${i}`;
    const countKeyAlt = `qc_cat_count_${i}`;

    const reason = row[reasonKey] || row[reasonKeyAlt] || '';
    const countStr = row[countKey] || row[countKeyAlt] || '';
    const count = parseInt(countStr, 10) || 0;

    // Only include QC/CAT reasons that start with "CC:"
    if (reason && reason.trim().startsWith('CC:') && count > 0) {
      reasons.push({ reason: reason.trim(), count });
    }
  }

  return reasons;
}

async function updateSyncLog(
  logId: number,
  status: string,
  result: ReturnsSyncResult,
  errorMessage?: string
): Promise<void> {
  await query(
    `UPDATE returns_sync_logs SET
      completed_at = NOW(),
      status = $1,
      rows_fetched = $2,
      rows_with_cc_fault = $3,
      rows_inserted = $4,
      rows_updated = $5,
      error_message = $6
    WHERE id = $7`,
    [
      status,
      result.rows_fetched,
      result.rows_with_cc_fault,
      result.rows_inserted,
      result.rows_updated,
      errorMessage || (result.errors.length > 0 ? result.errors.join('; ') : null),
      logId,
    ]
  );
}

interface ReturnsSyncLog {
  id: number;
  started_at: Date;
  completed_at: Date | null;
  status: 'running' | 'success' | 'failed';
  rows_fetched: number;
  rows_with_cc_fault: number;
  rows_inserted: number;
  rows_updated: number;
  error_message: string | null;
}

export async function getReturnsSyncLogs(limit: number = 20): Promise<ReturnsSyncLog[]> {
  const result = await query<ReturnsSyncLog>(
    `SELECT * FROM returns_sync_logs ORDER BY started_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}
