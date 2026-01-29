# Database Schema

PostgreSQL 15 database for Quality Monitoring system.

## Connection

```
Host: localhost (dev) | 46.62.208.26 (prod)
Port: 5432 (dev) | 5450 (prod)
Database: quality_monitoring
User: quality_user
```

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │     issues      │       │  issue_sources  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ responsible_cc_id│       │ id (PK)         │
│ email           │       │ source_id       │──────▶│ name            │
│ full_name       │       │ issue_date      │       │ display_name    │
│ team            │       │ issue_type      │       │ google_sheet_id │
│ role            │       │ issue_rate      │       │ sheet_gid       │
│ team_lead_id    │───┐   │ ...             │       │ is_active       │
│ is_active       │   │   └─────────────────┘       │ last_sync_at    │
└─────────────────┘   │                             └─────────────────┘
        ▲             │
        │             │   ┌─────────────────┐
        └─────────────┘   │   sync_logs     │
         (self-ref)       ├─────────────────┤
                          │ id (PK)         │
                          │ source_id (FK)  │
                          │ started_at      │
                          │ completed_at    │
                          │ status          │
                          │ rows_fetched    │
                          │ rows_inserted   │
                          │ error_message   │
                          └─────────────────┘
```

## Tables

### users

Stores all system users (Admin, Team Leads, CCs).

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    team VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'cc' CHECK (role IN ('admin', 'team_lead', 'cc')),
    team_lead_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_team_lead ON users(team_lead_id);
CREATE INDEX idx_users_team ON users(team);
CREATE INDEX idx_users_email ON users(email);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | Auto-increment ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| password_hash | VARCHAR(255) | - | Bcrypt hash (nullable for imported users) |
| full_name | VARCHAR(255) | NOT NULL | Display name |
| team | VARCHAR(50) | NOT NULL | Team name (LV, CS, Block, etc.) |
| role | VARCHAR(20) | CHECK | One of: admin, team_lead, cc |
| team_lead_id | INTEGER | FK → users.id | Self-reference to team lead |
| is_active | BOOLEAN | DEFAULT true | Account status |
| created_at | TIMESTAMPTZ | DEFAULT NOW | Creation timestamp |

### issue_sources

Configuration for Google Sheets data sources.

```sql
CREATE TABLE issue_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    google_sheet_id VARCHAR(100) NOT NULL,
    sheet_gid VARCHAR(50) DEFAULT '0',
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment ID |
| name | VARCHAR(50) | Internal name (LV, CS, Block, CDT_CW, QA) |
| display_name | VARCHAR(100) | Human-readable name |
| google_sheet_id | VARCHAR(100) | Google Sheets document ID |
| sheet_gid | VARCHAR(50) | Sheet tab GID (default: 0) |
| is_active | BOOLEAN | Whether to sync this source |
| last_sync_at | TIMESTAMPTZ | Last successful sync time |

**Current Sources:**

| name | google_sheet_id | sheet_gid |
|------|-----------------|-----------|
| LV | 1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I | 0 |
| CS | 1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0 | 0 |
| Block | 13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE | 0 |
| CDT_CW | 1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM | 0 |
| QA | 1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0 | 1250110979 |

### issues

Main table storing all quality issues from all sources.

```sql
CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    source_id INTEGER NOT NULL REFERENCES issue_sources(id),
    external_row_hash VARCHAR(64),

    -- Core fields
    issue_date DATE NOT NULL,
    responsible_cc_id INTEGER REFERENCES users(id),
    responsible_cc_name VARCHAR(255),
    cid VARCHAR(255),
    issue_type VARCHAR(500),
    comment TEXT,
    issue_rate SMALLINT CHECK (issue_rate BETWEEN 1 AND 3),
    issue_category VARCHAR(20) CHECK (issue_category IN ('client', 'internal')),

    -- Additional fields
    reported_by VARCHAR(255),
    task_id VARCHAR(255),

    -- Raw data storage
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(source_id, external_row_hash)
);

CREATE INDEX idx_issues_date ON issues(issue_date DESC);
CREATE INDEX idx_issues_source ON issues(source_id);
CREATE INDEX idx_issues_cc ON issues(responsible_cc_id);
CREATE INDEX idx_issues_rate ON issues(issue_rate);
CREATE INDEX idx_issues_hash ON issues(source_id, external_row_hash);
```

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment ID |
| source_id | INTEGER | FK to issue_sources |
| external_row_hash | VARCHAR(64) | SHA256 hash for deduplication |
| issue_date | DATE | Date when issue occurred |
| responsible_cc_id | INTEGER | FK to users (linked CC) |
| responsible_cc_name | VARCHAR(255) | Original CC name from sheet |
| cid | VARCHAR(255) | Client/Customer ID |
| issue_type | VARCHAR(500) | Type/category of issue |
| comment | TEXT | Additional comments |
| issue_rate | SMALLINT | Severity: 1=low, 2=medium, 3=critical |
| issue_category | VARCHAR(20) | 'client' or 'internal' |
| reported_by | VARCHAR(255) | Who reported the issue |
| task_id | VARCHAR(255) | Related task/ticket ID |
| raw_data | JSONB | Original row data from sheet |
| created_at | TIMESTAMPTZ | When record was created |

### sync_logs

Audit log for data synchronization operations.

```sql
CREATE TABLE sync_logs (
    id SERIAL PRIMARY KEY,
    source_id INTEGER REFERENCES issue_sources(id),
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) CHECK (status IN ('running', 'success', 'failed')),
    rows_fetched INTEGER DEFAULT 0,
    rows_inserted INTEGER DEFAULT 0,
    rows_updated INTEGER DEFAULT 0,
    error_message TEXT
);

CREATE INDEX idx_sync_logs_source ON sync_logs(source_id);
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
```

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Auto-increment ID |
| source_id | INTEGER | FK to issue_sources |
| started_at | TIMESTAMPTZ | When sync started |
| completed_at | TIMESTAMPTZ | When sync finished |
| status | VARCHAR(20) | 'running', 'success', or 'failed' |
| rows_fetched | INTEGER | Total rows from Google Sheets |
| rows_inserted | INTEGER | New rows added |
| rows_updated | INTEGER | Existing rows updated |
| error_message | TEXT | Error details if failed |

## Common Queries

### Get issues for a user (role-based)

```sql
-- Admin: all issues
SELECT * FROM issues WHERE 1=1;

-- Team Lead: team members' issues
SELECT i.* FROM issues i
LEFT JOIN users u ON i.responsible_cc_id = u.id
WHERE u.team_lead_id = :team_lead_id;

-- CC: own issues only
SELECT * FROM issues WHERE responsible_cc_id = :cc_id;
```

### Dashboard overview stats

```sql
WITH date_ranges AS (
    SELECT
        CURRENT_DATE as today,
        CURRENT_DATE - INTERVAL '7 days' as week_start,
        DATE_TRUNC('month', CURRENT_DATE) as month_start
)
SELECT
    COUNT(*) as total_issues,
    COUNT(*) FILTER (WHERE issue_date = (SELECT today FROM date_ranges)) as today,
    COUNT(*) FILTER (WHERE issue_date >= (SELECT week_start FROM date_ranges)) as this_week,
    COUNT(*) FILTER (WHERE issue_date >= (SELECT month_start FROM date_ranges)) as this_month,
    COUNT(*) FILTER (WHERE issue_rate = 3) as critical
FROM issues;
```

### CC performance with trends

```sql
WITH date_ranges AS (
    SELECT
        CURRENT_DATE - INTERVAL '7 days' as week_start,
        CURRENT_DATE - INTERVAL '14 days' as last_week_start
)
SELECT
    u.id,
    u.full_name,
    u.team,
    COUNT(*) as total_issues,
    COUNT(*) FILTER (WHERE i.issue_date >= (SELECT week_start FROM date_ranges)) as this_week,
    COUNT(*) FILTER (WHERE i.issue_date >= (SELECT last_week_start FROM date_ranges)
                       AND i.issue_date < (SELECT week_start FROM date_ranges)) as last_week,
    ARRAY_AGG(DISTINCT s.name) FILTER (WHERE i.issue_date >= (SELECT week_start FROM date_ranges)) as sources
FROM issues i
LEFT JOIN users u ON i.responsible_cc_id = u.id
LEFT JOIN issue_sources s ON i.source_id = s.id
GROUP BY u.id, u.full_name, u.team
ORDER BY this_week DESC;
```

### Link issues to users by name

```sql
UPDATE issues i
SET responsible_cc_id = u.id
FROM users u
WHERE i.responsible_cc_id IS NULL
  AND i.responsible_cc_name IS NOT NULL
  AND LOWER(TRIM(i.responsible_cc_name)) = LOWER(TRIM(u.full_name));
```

## Maintenance

### Vacuum and analyze

```sql
VACUUM ANALYZE issues;
VACUUM ANALYZE users;
VACUUM ANALYZE sync_logs;
```

### Check table sizes

```sql
SELECT
    relname as table,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Backup

```bash
# Full backup
docker exec qm-postgres pg_dump -U quality_user quality_monitoring > backup.sql

# Restore
docker exec -i qm-postgres psql -U quality_user quality_monitoring < backup.sql
```
