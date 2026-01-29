# API Reference

Base URL: `http://localhost:3000` (dev) | `http://46.62.208.26:3000` (prod)

## Authentication

All endpoints except `/auth/login` require Bearer token authentication.

```
Authorization: Bearer <access_token>
```

---

## Auth Endpoints

### POST /auth/login

Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "abc123...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "admin",
    "team": "LV"
  }
}
```

### GET /auth/me

Get current authenticated user.

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "admin",
  "team": "LV",
  "team_lead_id": null
}
```

### POST /auth/logout

Logout and invalidate refresh token.

**Request:**
```json
{
  "refresh_token": "abc123..."
}
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Dashboard Endpoints

### GET /api/dashboard/overview

Get summary statistics.

**Response (200):**
```json
{
  "total_issues": 10312,
  "issues_today": 15,
  "issues_this_week": 44,
  "issues_this_month": 193,
  "critical_issues": 1171
}
```

### GET /api/dashboard/trends

Get daily issue counts for trend chart.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| days | number | 30 | Number of days to fetch |

**Response (200):**
```json
{
  "trends": [
    { "date": "2025-12-27", "count": 12 },
    { "date": "2025-12-28", "count": 8 },
    { "date": "2025-12-29", "count": 15 }
  ]
}
```

### GET /api/dashboard/by-team

Get issue counts grouped by team.

**Response (200):**
```json
{
  "by_team": [
    {
      "team": "LV",
      "count": 5234,
      "rate_1": 2100,
      "rate_2": 2500,
      "rate_3": 634
    },
    {
      "team": "CS",
      "count": 3021,
      "rate_1": 1200,
      "rate_2": 1500,
      "rate_3": 321
    }
  ]
}
```

### GET /api/dashboard/by-cc

Get issue counts grouped by CC.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 10 | Max results |

**Response (200):**
```json
{
  "by_cc": [
    {
      "cc_id": 5,
      "cc_name": "Emmanuel Adinlewa",
      "team": "LV",
      "count": 284,
      "rate_avg": 1.9
    }
  ]
}
```

### GET /api/dashboard/by-source

Get issue counts grouped by source.

**Response (200):**
```json
{
  "by_source": [
    { "source": "LV", "display_name": "LV Issues", "count": 5234 },
    { "source": "CS", "display_name": "CS Issues", "count": 3021 },
    { "source": "Block", "display_name": "Block Issues", "count": 1200 },
    { "source": "CDT_CW", "display_name": "CDT/CW Issues", "count": 800 },
    { "source": "QA", "display_name": "QA Issues", "count": 57 }
  ]
}
```

### GET /api/dashboard/cc-analytics

Get CC performance with week-over-week trends. Supports historical filtering by year/month.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| year | number | - | Filter by year (e.g., 2025, 2026) |
| month | number | - | Filter by month (1-12), requires year |

**Response (200) - Current Period (no params):**
```json
{
  "cc_analytics": [
    {
      "cc_id": 5,
      "cc_name": "Emmanuel Adinlewa",
      "team": "LV",
      "team_lead": "Daria Chernoskutova",
      "total_issues": 284,
      "this_week": 1,
      "last_week": 0,
      "week_trend": 100,
      "this_month": 5,
      "last_month": 12,
      "month_trend": -58,
      "sources": ["LV"],
      "status": "declining"
    }
  ]
}
```

**Response (200) - Historical Period (with year/month):**
```json
{
  "period_label": "July 2025",
  "cc_analytics": [
    {
      "cc_id": 5,
      "cc_name": "Emmanuel Adinlewa",
      "team": "LV",
      "team_lead": "Daria Chernoskutova",
      "total_issues": 45,
      "this_week": 0,
      "last_week": 0,
      "week_trend": 0,
      "this_month": 45,
      "last_month": 0,
      "month_trend": 0,
      "sources": ["LV"],
      "status": "stable"
    }
  ]
}
```

**Status values:**
- `improving` - fewer issues than last week (week_trend < 0)
- `declining` - more issues than last week (week_trend > 0)
- `stable` - same as last week (week_trend = 0)

### GET /api/dashboard/available-periods

Get available years and months for historical filtering.

**Response (200):**
```json
{
  "years": [2026, 2025],
  "months_by_year": {
    "2026": [1],
    "2025": [7, 8, 9, 10, 11, 12]
  }
}
```

### GET /api/dashboard/team-analytics

Get team performance with trends.

**Response (200):**
```json
{
  "team_analytics": [
    {
      "team": "LV",
      "team_lead": "Viktoriia Rozhnova",
      "cc_count": 61,
      "total_issues": 5234,
      "this_week": 40,
      "last_week": 70,
      "week_trend": -43,
      "this_month": 193,
      "critical_count": 371,
      "avg_rate": 1.7,
      "status": "improving"
    }
  ]
}
```

### GET /api/dashboard/issue-analytics

Get issue analytics with month comparison and insights.

**Response (200):**
```json
{
  "month_comparison": {
    "this_month": 193,
    "last_month": 245,
    "trend": -21.2,
    "status": "improving"
  },
  "by_team": [
    {
      "team_lead": "Viktoriia Rozhnova",
      "this_month": 45,
      "last_month": 52,
      "trend": -13.5,
      "top_issue_type": "Wrong info"
    }
  ],
  "insights": [
    "Viktoriia Rozhnova team shows improvement with 45 issues this month (-13.5%), mainly in \"Wrong info\"",
    "Overall issues decreased by 21.2% compared to last month"
  ]
}
```

---

## Returns Endpoints

### GET /api/returns

List returns with pagination and filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| date_from | string | - | Start date (YYYY-MM-DD) |
| date_to | string | - | End date (YYYY-MM-DD) |
| cc_user_id | number | - | CC user ID |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1,
      "return_date": "2026-01-15",
      "client_name": "Acme Corp",
      "block": "DA block",
      "cid": "CID123456",
      "cc_abbreviation": "VY",
      "cc_user_id": 15,
      "cc_name": "Varvara Yevsiukova",
      "team_lead_name": "Maria Kavalek",
      "reasons": [
        { "reason": "CC: Industry doesn't fit", "count": 5 }
      ],
      "total_leads": 5,
      "cc_fault": 5,
      "initial_returns_number": 12
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 118,
    "total_pages": 3
  }
}
```

### GET /api/returns/overview

Get returns summary statistics.

**Response (200):**
```json
{
  "total_returns": 817,
  "total_cc_fault": 118,
  "cc_fault_percent": 14.4,
  "returns_this_week": 45,
  "cc_fault_this_week": 12,
  "cc_fault_percent_this_week": 26.7,
  "returns_this_month": 817,
  "cc_fault_this_month": 118,
  "cc_fault_percent_this_month": 14.4
}
```

### GET /api/returns/by-cc

Get returns grouped by CC.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Max results |

**Response (200):**
```json
{
  "by_cc": [
    {
      "cc_id": 15,
      "cc_name": "Varvara Yevsiukova",
      "cc_abbreviation": "VY",
      "team_lead": "Maria Kavalek",
      "return_count": 10,
      "total_returns": 99,
      "total_cc_fault": 61
    }
  ]
}
```

### GET /api/returns/by-reason

Get returns grouped by reason.

**Response (200):**
```json
{
  "by_reason": [
    {
      "reason": "CC: Industry doesn't fit",
      "total_count": 79,
      "return_count": 15
    },
    {
      "reason": "CC: Job Function doesn't fit",
      "total_count": 35,
      "return_count": 8
    }
  ]
}
```

### GET /api/returns/trends

Get daily returns trends.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| days | number | 30 | Number of days |

**Response (200):**
```json
{
  "trends": [
    {
      "date": "2026-01-01",
      "total_returns": 25,
      "cc_fault": 5
    }
  ]
}
```

### GET /api/returns/analytics

Get comprehensive returns analytics for a period. **Main analytics endpoint.**

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| period | string | month | Period: `week`, `month`, or `quarter` |

**Response (200):**
```json
{
  "period": "month",
  "summary": {
    "total_records": 118,
    "total_returns": 817,
    "total_cc_fault": 118,
    "cc_fault_percent": 14.4,
    "cc_with_faults": 8,
    "blocks_affected": 15
  },
  "by_reason": [
    {
      "reason": "CC: Industry doesn't fit",
      "count": 79,
      "unique_cids": 4
    },
    {
      "reason": "CC: Job Function doesn't fit",
      "count": 35,
      "unique_cids": 5
    },
    {
      "reason": "CC: Not correct asset",
      "count": 4,
      "unique_cids": 1
    }
  ],
  "by_team": [
    {
      "team_lead_id": 2,
      "team_lead_name": "Maria Kavalek",
      "cc_count": 2,
      "total_returns": 107,
      "total_cc_fault": 66,
      "cc_fault_percent": 61.7,
      "blocks": ["DA block", "DU block", "XA block"]
    }
  ],
  "by_cc": [
    {
      "cc_id": 15,
      "cc_name": "Varvara Yevsiukova",
      "cc_abbreviation": "VY-6H-WORK",
      "team_lead": "Maria Kavalek",
      "total_returns": 99,
      "total_cc_fault": 61,
      "cc_fault_percent": 61.6,
      "blocks": ["DA block", "DU block"]
    }
  ]
}
```

### POST /api/returns/sync

Trigger returns sync from Google Sheets. **Admin only.**

**Response (200):**
```json
{
  "success": true,
  "rows_fetched": 150,
  "rows_with_cc_fault": 118,
  "rows_inserted": 5,
  "rows_updated": 113,
  "errors": []
}
```

### GET /api/returns/sync/logs

Get returns sync history.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Max results |

**Response (200):**
```json
{
  "logs": [
    {
      "id": 50,
      "started_at": "2026-01-28T10:30:00Z",
      "completed_at": "2026-01-28T10:30:15Z",
      "status": "success",
      "rows_fetched": 150,
      "rows_with_cc_fault": 118,
      "rows_inserted": 5,
      "rows_updated": 113,
      "error_message": null
    }
  ]
}
```

---

## Issues Endpoints

### GET /api/issues

List issues with pagination and filters.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page |
| date_from | string | - | Start date (YYYY-MM-DD) |
| date_to | string | - | End date (YYYY-MM-DD) |
| source | string | - | Source name (LV, CS, Block, CDT_CW, QA) |
| team | string | - | Team name |
| responsible_cc_id | number | - | CC user ID |
| issue_rate | number | - | Severity (1, 2, 3) |
| search | string | - | Search in CC name, CID, type |

**Response (200):**
```json
{
  "data": [
    {
      "id": 1234,
      "issue_date": "2026-01-15",
      "responsible_cc_id": 5,
      "responsible_cc_name": "Emmanuel Adinlewa",
      "cid": "CID123456",
      "issue_type": "Wrong info",
      "comment": "Incorrect data entered",
      "issue_rate": 2,
      "source_name": "LV",
      "team": "LV",
      "reported_by": "QA Team"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 10312,
    "total_pages": 207
  }
}
```

### GET /api/issues/:id

Get single issue by ID.

**Response (200):**
```json
{
  "id": 1234,
  "issue_date": "2026-01-15",
  "responsible_cc_id": 5,
  "responsible_cc_name": "Emmanuel Adinlewa",
  "cid": "CID123456",
  "issue_type": "Wrong info",
  "comment": "Incorrect data entered",
  "issue_rate": 2,
  "issue_category": "client",
  "source_id": 1,
  "source_name": "LV",
  "reported_by": "QA Team",
  "task_id": "TASK-123",
  "raw_data": { /* original row data */ },
  "created_at": "2026-01-15T10:30:00Z"
}
```

### GET /api/issues/stats

Get aggregated statistics.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| date_from | string | Start date |
| date_to | string | End date |

**Response (200):**
```json
{
  "total": 10312,
  "by_rate": {
    "1": 4500,
    "2": 4200,
    "3": 1612
  },
  "by_category": {
    "client": 6500,
    "internal": 3812
  }
}
```

---

## Users Endpoints

### GET /api/users

List all users (for dropdowns).

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "full_name": "Emmanuel Adinlewa",
      "email": "e.adinlewa@example.com",
      "team": "LV",
      "role": "cc"
    }
  ]
}
```

### GET /api/users/dropdown

Get users for filter dropdowns (simplified).

**Response (200):**
```json
{
  "users": [
    { "id": 1, "full_name": "Emmanuel Adinlewa", "team": "LV" }
  ]
}
```

---

## Sync Endpoints

### GET /api/sync/status

Get current sync status.

**Response (200):**
```json
{
  "lastSync": "2026-01-26T10:30:00Z",
  "isRunning": false,
  "sources": [
    { "name": "LV", "lastSync": "2026-01-26T10:30:00Z" },
    { "name": "CS", "lastSync": "2026-01-26T10:30:00Z" },
    { "name": "Block", "lastSync": "2026-01-26T10:30:00Z" },
    { "name": "CDT_CW", "lastSync": "2026-01-26T10:30:00Z" },
    { "name": "QA", "lastSync": "2026-01-26T10:25:00Z" }
  ]
}
```

### POST /api/sync/trigger

Trigger manual sync for all sources. **Admin only.**

**Response (200):**
```json
{
  "message": "Sync started",
  "results": [
    {
      "source": "LV",
      "status": "success",
      "rows_fetched": 150,
      "rows_inserted": 5,
      "rows_updated": 2
    }
  ]
}
```

### GET /api/sync/logs

Get sync history.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 50 | Max results |

**Response (200):**
```json
{
  "logs": [
    {
      "id": 100,
      "source_id": 1,
      "source_name": "LV",
      "started_at": "2026-01-26T10:30:00Z",
      "completed_at": "2026-01-26T10:30:15Z",
      "status": "success",
      "rows_fetched": 150,
      "rows_inserted": 5,
      "rows_updated": 2,
      "error_message": null
    }
  ]
}
```

---

## Admin Endpoints

### GET /api/admin/users

Get all users with details. **Admin only.**

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "full_name": "John Doe",
      "role": "cc",
      "team": "LV",
      "team_lead_id": 5,
      "team_lead_name": "Jane Smith",
      "is_active": true,
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

### POST /api/admin/users

Create new user. **Admin only.**

**Request:**
```json
{
  "email": "new.user@example.com",
  "full_name": "New User",
  "password": "password123",
  "role": "cc",
  "team": "LV",
  "team_lead_id": 5
}
```

### PUT /api/admin/users/:id

Update user. **Admin only.**

**Request:**
```json
{
  "role": "team_lead",
  "team": "CS",
  "is_active": true
}
```

### GET /api/admin/sources

Get configured data sources. **Admin only.**

**Response (200):**
```json
{
  "sources": [
    {
      "id": 1,
      "name": "LV",
      "display_name": "LV Issues",
      "google_sheet_id": "1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I",
      "sheet_gid": "0",
      "is_active": true,
      "last_sync_at": "2026-01-26T10:30:00Z"
    }
  ]
}
```

### GET /api/admin/stats

Get system statistics. **Admin only.**

**Response (200):**
```json
{
  "users": {
    "total": 67,
    "admins": 2,
    "team_leads": 12,
    "ccs": 53
  },
  "issues": {
    "total": 10312,
    "this_week": 44,
    "this_month": 193
  },
  "sync": {
    "last_sync": "2026-01-26T10:30:00Z",
    "total_syncs_today": 144
  }
}
```

---

## Reports Endpoints

### GET /api/reports/daily

Get daily report data.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string | today | Report date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "date": "2026-01-27",
  "total_issues": 15,
  "issues_by_team": [
    {
      "team_lead": "Viktoriia Rozhnova",
      "count": 5,
      "issues": [...]
    }
  ]
}
```

### GET /api/reports/daily/preview

Preview daily report HTML.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| date | string | today | Report date (YYYY-MM-DD) |

**Response (200):**
```json
{
  "html": "<html>...</html>",
  "subject": "Quality Report - 2026-01-27",
  "issues_count": 15
}
```

### POST /api/reports/daily/send

Send daily report to specific recipients.

**Request:**
```json
{
  "recipients": ["email@example.com"],
  "date": "2026-01-27"
}
```

**Response (200):**
```json
{
  "success": true,
  "sent_to": ["email@example.com"],
  "issues_count": 15
}
```

### POST /api/reports/send-all

Send all daily reports (operations + team leads). **Admin only.**

**Request:**
```json
{
  "date": "2026-01-27"
}
```

**Response (200):**
```json
{
  "success": true,
  "operations_report": {
    "sent": true,
    "recipients": 2,
    "issues_count": 15
  },
  "team_lead_reports": {
    "sent": 5,
    "skipped": 2,
    "total": 7
  }
}
```

### GET /api/reports/test-connection

Test SMTP connection.

**Response (200):**
```json
{
  "success": true,
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587
}
```

### POST /api/reports/test-send

Send test email.

**Request:**
```json
{
  "email": "test@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Test email sent to test@example.com"
}
```

### GET /api/reports/recipients

Get report recipients (Team Leads with emails).

**Response (200):**
```json
{
  "recipients": [
    {
      "id": 5,
      "full_name": "Viktoriia Rozhnova",
      "email": "v.rozhnova@example.com",
      "team_members_count": 12
    }
  ]
}
```

### GET /api/reports/email-logs

Get email sending history.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 50 | Max results |

**Response (200):**
```json
{
  "logs": [
    {
      "id": 100,
      "report_type": "team_lead",
      "report_date": "2026-01-27",
      "recipient_email": "v.rozhnova@example.com",
      "recipient_name": "Viktoriia Rozhnova",
      "subject": "Quality Report - 2026-01-27",
      "issues_count": 5,
      "status": "sent",
      "error_message": null,
      "sent_at": "2026-01-27T12:00:00Z"
    }
  ]
}
```

### POST /api/reports/email-logs/cleanup

Delete email logs older than 30 days. **Admin only.**

**Response (200):**
```json
{
  "success": true,
  "deleted_count": 150
}
```

---

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid date format"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Issue not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```
