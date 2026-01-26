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
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| Backend | Node.js 20 + Fastify + TypeScript |
| Database | PostgreSQL 15 |
| Auth | JWT + Role-based access (Admin / Team Lead / CC) |
| Data Sync | Google Sheets API (every 10 min via cron) |
| Deployment | Docker Compose on VPS |

## Project Structure

```
quality-monitoring/
├── backend/                 # Fastify API server
│   ├── src/
│   │   ├── config/          # Database, Google Sheets, env config
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic (sync service)
│   │   ├── middleware/      # Auth, role-based filtering
│   │   ├── types/           # TypeScript interfaces
│   │   └── index.ts         # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/                # React SPA
│   ├── src/
│   │   ├── components/      # Reusable UI (shadcn/ui, layout)
│   │   ├── features/        # Page modules (dashboard, issues, admin)
│   │   ├── lib/             # API client, utilities
│   │   ├── hooks/           # React hooks
│   │   └── main.tsx         # Entry point
│   ├── Dockerfile
│   └── package.json
├── database/                # SQL schemas and migrations
│   └── schema.sql
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

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow, component diagram |
| [API Reference](docs/API.md) | All REST endpoints with request/response examples |
| [Database Schema](docs/DATABASE.md) | Tables, relationships, indexes, queries |
| [Deployment](docs/DEPLOYMENT.md) | Docker, VPS setup, SSL, monitoring |
| [Development](docs/DEVELOPMENT.md) | Local setup, coding guidelines, testing |
| [Google Sheets Sync](docs/SYNC.md) | Data sources, column mappings, troubleshooting |

## Key Features

### Analytics Dashboard
- KPI cards (Total Issues, This Week, This Month, Critical)
- 30-day trend chart
- Team performance cards with week-over-week comparison
- CC performance table with search, filters, status indicators

### Issue Management
- Paginated table with all issues
- Filters: date range, source, team, CC, severity
- Export to CSV

### Role-Based Access Control
| Role | Data Access | Features |
|------|-------------|----------|
| Admin | All data | User management, sync control, settings |
| Team Lead | Own team's data | Team analytics |
| CC | Own data only | Personal issues view |

### Auto Sync
- Google Sheets data pulled every 10 minutes
- 5 sources: LV, CS, Block, CDT_CW, QA
- Deduplication via row hash
- Auto-linking CC names to user accounts

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

# Database
docker exec -it qm-postgres psql -U quality_user -d quality_monitoring

# Manual sync trigger
curl -X POST http://localhost:3000/api/sync/trigger
```

## Support

For issues or questions, contact the development team or create an issue in the repository.

## License

Internal use only - INFUSE
