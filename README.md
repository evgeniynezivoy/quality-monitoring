# Quality Monitoring System

Web-платформа для мониторинга качества работы команд Campaign Coordinators (CC). Автоматическая синхронизация данных об ошибках из Google Sheets каждые 10 минут.

## Quick Start

```bash
# Clone repository
git clone https://github.com/evgeniynezivoy/quality-monitoring.git
cd quality-monitoring

# Copy environment file
cp .env.example .env
# Edit .env with your credentials

# Start with Docker
docker compose up -d

# Access
# Frontend: http://localhost:8080
# Backend API: http://localhost:3000
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts |
| Backend | Node.js 20 + Fastify + TypeScript |
| Database | PostgreSQL 15 |
| Auth | JWT + Role-based access (Admin / Team Lead / CC) |
| Data Sync | Google Sheets API (every 10 min via cron) |
| Email | Nodemailer (SMTP) + HTML templates |
| Deployment | Docker Compose on VPS |

## Project Structure

```
quality-monitoring/
├── backend/                 # Fastify API server (~4,000 lines)
│   ├── src/
│   │   ├── config/          # Database, Google Sheets, SMTP, env
│   │   ├── routes/          # API endpoints (8 route files)
│   │   │   ├── auth.routes.ts        # Login, logout, me
│   │   │   ├── dashboard.routes.ts   # Analytics endpoints
│   │   │   ├── issues.routes.ts      # Issues CRUD
│   │   │   ├── returns.routes.ts     # Returns analytics
│   │   │   ├── reports.routes.ts     # Email reports
│   │   │   ├── sync.routes.ts        # Manual sync triggers
│   │   │   ├── users.routes.ts       # User management
│   │   │   └── admin.routes.ts       # Admin functions
│   │   ├── services/        # Business logic (7 service files)
│   │   │   ├── sync.service.ts       # Issues sync from Google Sheets
│   │   │   ├── returns-sync.service.ts # Returns sync
│   │   │   ├── team-sync.service.ts  # Team roster sync
│   │   │   ├── report.service.ts     # Email report generation
│   │   │   ├── cron.service.ts       # Scheduled jobs
│   │   │   ├── issues.service.ts     # Issues queries
│   │   │   └── users.service.ts      # Users queries
│   │   ├── middleware/      # Auth, role-based filtering
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/                # React SPA (~4,600 lines)
│   ├── src/
│   │   ├── components/      # Reusable UI (shadcn/ui, layout)
│   │   │   ├── ui/          # Button, Card, Table, Select, etc.
│   │   │   └── layout/      # Header, Sidebar
│   │   ├── features/        # Page modules
│   │   │   ├── dashboard/   # Main dashboard with tabs
│   │   │   ├── issues/      # Issues table + My Issues
│   │   │   ├── team/        # Team structure view
│   │   │   ├── admin/       # Admin panel + Sync page
│   │   │   └── auth/        # Login page
│   │   ├── lib/             # API client, utilities
│   │   ├── hooks/           # useAuth hook
│   │   └── main.tsx         # Entry point
│   ├── Dockerfile
│   └── package.json
├── database/                # SQL schemas
│   └── schema.sql           # 7 tables, 15+ indexes
├── docs/                    # Full documentation
│   ├── ARCHITECTURE.md      # System design
│   ├── API.md               # REST API reference
│   ├── DATABASE.md          # Schema documentation
│   ├── DEPLOYMENT.md        # Production setup
│   ├── DEVELOPMENT.md       # Local dev guide
│   └── SYNC.md              # Google Sheets sync
├── docker-compose.yml
└── .env.example
```

## Key Features

### 1. Analytics Dashboard (Main Tab)

**KPI Cards:**
- Total Issues (all time)
- This Week count with week-over-week trend
- This Month count with month-over-month trend
- Critical Issues (rate = 3)

**30-Day Trend Chart:**
- Interactive area chart showing daily issue counts
- Tooltips with detailed day information

**Team Performance Section:**
- **Default view**: Team Leads with aggregated statistics
- **Drill-down**: Click Team Lead to expand individual CCs
- **Period selector**: Week / Month / Quarter
- **Status indicators**:
  - 🟢 Improving (fewer issues than previous period)
  - 🔴 Declining (more issues)
  - ⚪ Stable (no change)

**Month-over-Month Comparison:**
- Current vs Previous period cards
- Percentage change indicators
- Critical issues breakdown

**Auto-generated Insights:**
- Top performing teams
- Areas needing attention
- Trend observations

### 2. Returns Analytics (Returns Tab)

**Overview Cards:**
- Total Returns (all leads returned)
- CC Fault count and percentage
- This Week breakdown
- This Month breakdown

**Returns Trend Chart:**
- 30-day visualization of CC faults

**Period Analytics (Week/Month/Quarter):**
- **Period Summary**: Total returns, CC faults, fault percentage
- **CC Fault Distribution**: Breakdown by reason (CC: Industry doesn't fit, CC: Job Function doesn't fit, etc.)
- **By Team Lead**: Aggregated faults per team
- **CC Fault Details**: Individual CC performance with blocks

### 3. Issue Management

**Issues Page (`/issues`):**
- Paginated data table with sorting
- Filters: Date range, Source, Team, CC, Severity
- Columns: Date, CC, CID, Issue Type, Source, Severity
- Export to CSV

**My Issues Page (`/my-issues`):**
- Personal view for CC role
- Same filters, limited to own data

### 4. Email Reports System

**Daily Automated Reports:**
- **Schedule**: 7:00 AM EST (12:00 UTC)
- **Operations Report**: All issues to ops team
- **Team Lead Reports**: Team-specific issues to each TL

**Weekend Logic:**
- Saturday/Sunday: No reports sent
- Monday report: Includes Fri + Sat + Sun issues

**Report Features:**
- HTML formatted emails
- Summary statistics
- Detailed issue tables
- Sent via SMTP (Gmail compatible)

**Admin Controls:**
- Preview report before sending
- Manual send for any date
- Test email functionality
- Email logs with status tracking

### 5. User Management

**Roles & Access:**

| Role | Data Access | Features |
|------|-------------|----------|
| Admin | All data | User management, sync control, settings, reports |
| Team Lead | Own team's data | Team analytics, receive daily reports |
| CC | Own data only | Personal issues view |

**Admin Panel:**
- Create/Edit users
- Assign roles and team leads
- Activate/Deactivate users
- View sync logs and status

**Team Structure Page:**
- Visual team hierarchy
- Sync from Google Sheets Team Roster
- CC abbreviation management

### 6. Data Synchronization

**Auto Sync (every 10 minutes):**

| Source | Description | Sheet |
|--------|-------------|-------|
| LV | Lead Validation issues | Separate sheet |
| CS | Customer Service issues | Separate sheet |
| Block | Block team issues | Separate sheet |
| CDT_CW | CDT/CW combined | Separate sheet |
| QA | Quality Assurance | Separate sheet |
| Returns | Lead returns data | Returns tracker sheet |
| Team | Team roster | Team structure sheet |

**Sync Features:**
- Row hash deduplication (prevents duplicates)
- Auto-link CC names to user accounts
- Sync logs with detailed statistics
- Manual sync trigger available

## API Endpoints

### Authentication
```
POST   /auth/login           # Login with email/password
GET    /auth/me              # Get current user
POST   /auth/logout          # Logout (invalidate token)
```

### Dashboard Analytics
```
GET    /api/dashboard/overview      # KPI summary cards
GET    /api/dashboard/trends        # 30-day time series
GET    /api/dashboard/by-team       # Team-level aggregation
GET    /api/dashboard/by-cc         # CC-level aggregation
GET    /api/dashboard/by-source     # Source distribution
GET    /api/dashboard/cc-analytics  # Detailed CC analytics
GET    /api/dashboard/team-analytics # Team performance
GET    /api/dashboard/issue-analytics # Issue type analysis
```

### Returns Analytics
```
GET    /api/returns                 # List returns (paginated)
GET    /api/returns/overview        # Returns KPIs
GET    /api/returns/by-cc           # CC breakdown
GET    /api/returns/by-reason       # Reason distribution
GET    /api/returns/trends          # Daily trends
GET    /api/returns/analytics       # Full analytics (period: week/month/quarter)
POST   /api/returns/sync            # Trigger returns sync
GET    /api/returns/sync/logs       # Sync history
```

### Issues
```
GET    /api/issues                  # List (paginated, filtered)
GET    /api/issues/:id              # Single issue
GET    /api/issues/stats            # Aggregated stats
```

### Reports
```
GET    /api/reports/daily           # Get report data
GET    /api/reports/daily/preview   # Preview HTML report
POST   /api/reports/daily/send      # Send report
POST   /api/reports/send-all        # Send all reports
GET    /api/reports/test-connection # Test SMTP
POST   /api/reports/test-send       # Send test email
GET    /api/reports/recipients      # List recipients
GET    /api/reports/email-logs      # Email history
```

### Sync
```
POST   /api/sync/trigger            # Sync all sources
GET    /api/sync/status             # Current status
GET    /api/sync/logs               # Sync history
GET    /api/sync/team               # Team structure
POST   /api/sync/team               # Sync team roster
```

### Users & Admin
```
GET    /api/users                   # List users
GET    /api/users/dropdown          # For select inputs
GET    /api/users/team-leads        # Team leads only
GET    /api/admin/users             # All users (admin)
POST   /api/admin/users             # Create user
PUT    /api/admin/users/:id         # Update user
GET    /api/admin/sources           # Sheet configs
GET    /api/admin/stats             # System stats
```

## Database Schema

**7 Tables:**
- `users` - User accounts with roles
- `issues` - Unified issues from all sources
- `issue_sources` - Google Sheets configuration
- `sync_logs` - Issues sync history
- `returns` - Returns tracking data
- `returns_sync_logs` - Returns sync history
- `email_logs` - Email report history
- `refresh_tokens` - JWT refresh tokens

**15+ Indexes** for optimal query performance.

See [docs/DATABASE.md](docs/DATABASE.md) for full schema.

## Environment Variables

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=quality_monitoring
DB_USER=quality_user
DB_PASSWORD=secure_password_here

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Google Sheets API (Service Account)
GOOGLE_SERVICE_ACCOUNT_EMAIL=sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Frontend (Vite)
VITE_API_URL=http://localhost:3000

# Email Reports (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Quality Monitoring <your-email@gmail.com>
REPORT_RECIPIENTS=ops1@example.com,ops2@example.com
```

## Production Environment

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://37.27.5.172:8080 | 8080 |
| Backend API | http://37.27.5.172:3000 | 3000 |
| PostgreSQL | 37.27.5.172:5450 | 5450 |

## Common Commands

```bash
# Development
cd backend && npm run dev      # Start backend in dev mode
cd frontend && npm run dev     # Start frontend in dev mode

# Production
docker compose up -d --build   # Build and start all services
docker compose logs -f         # View logs
docker compose down            # Stop all services

# Rebuild specific service
docker compose build --no-cache backend
docker compose build --no-cache frontend
docker compose up -d

# Database access
docker exec -it qm-postgres psql -U quality_user -d quality_monitoring

# Manual sync trigger
curl -X POST http://localhost:3000/api/sync/trigger
curl -X POST http://localhost:3000/api/returns/sync
```

## Project Statistics

| Metric | Value |
|--------|-------|
| Total Lines of Code | ~8,600 |
| Backend Code | ~4,000 lines |
| Frontend Code | ~4,600 lines |
| API Endpoints | 35+ |
| Database Tables | 7 |
| Docker Services | 3 |

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component diagram |
| [API Reference](docs/API.md) | All REST endpoints with request/response examples |
| [Database Schema](docs/DATABASE.md) | Tables, relationships, indexes, queries |
| [Deployment](docs/DEPLOYMENT.md) | Docker, VPS setup, SSL, monitoring |
| [Development](docs/DEVELOPMENT.md) | Local setup, coding guidelines |
| [Google Sheets Sync](docs/SYNC.md) | Data sources, column mappings |

## Changelog

### v1.3.1 (January 29, 2026)
- Fixed issue description mapping - added 'issue' column for LV source
- Added Returns sync to cron schedule (every 10 minutes with Issues)
- Skip issues without Responsible CC name (prevents "Unknown" entries)
- Added PROJECT_ESTIMATE.md with outsourcing cost analysis

### v1.3.0 (January 2026)
- Added Returns Analytics with period selector (Week/Month/Quarter)
- Added CC Fault distribution by reason
- Added By Team Lead breakdown
- Fixed date parsing for US format (M/D/YYYY)
- Fixed sync to include all returns (not just CC faults)

### v1.2.0 (January 2026)
- Added Returns tracking feature
- Added interactive team drill-down
- Added quarter support with calendar-based periods
- Improved This Month calculations

### v1.1.0 (January 2026)
- Added daily email reports system
- Added weekend logic for reports
- Added email logs tracking
- Added Team Structure page

### v1.0.0 (December 2025)
- Initial release
- Dashboard with KPIs and trends
- Issues management
- Role-based access control
- Google Sheets auto-sync

## Support

For issues or questions, contact the development team or create an issue in the repository.

## License

Internal use only - INFUSE
