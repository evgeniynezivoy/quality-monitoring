# Quality Monitoring System

Web-платформа для мониторинга качества работы команд с синхронизацией данных из Google Sheets.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL
- **Auth**: JWT + роли (Admin / Team Lead / CC)
- **Deployment**: Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Google Cloud Service Account with Sheets API access

### Development Setup

1. Clone the repository:
```bash
git clone https://github.com/evgeniynezivoy/quality-monitoring.git
cd quality-monitoring
```

2. Copy environment file:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Start with Docker Compose:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost
- Backend API: http://localhost:3000

### Local Development (without Docker)

Backend:
```bash
cd backend
npm install
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Default Credentials

After first start, register the first user at `/login` - they will automatically become admin.

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `GET /auth/me` - Current user
- `POST /auth/refresh` - Refresh token

### Issues
- `GET /api/issues` - List issues (paginated, filtered)
- `GET /api/issues/:id` - Get single issue
- `GET /api/issues/stats` - Get statistics
- `GET /api/issues/export` - Export to CSV

### Dashboard
- `GET /api/dashboard/overview` - Summary stats
- `GET /api/dashboard/trends` - Time series data
- `GET /api/dashboard/by-team` - Stats by team
- `GET /api/dashboard/by-cc` - Stats by CC

### Sync (Admin only)
- `POST /api/sync/trigger` - Trigger manual sync
- `GET /api/sync/status` - Get sync status
- `GET /api/sync/logs` - Get sync history

## Role-Based Access

| Role | Access |
|------|--------|
| Admin | Full access |
| Team Lead | Team members' issues |
| CC | Own issues only |

## License

MIT
