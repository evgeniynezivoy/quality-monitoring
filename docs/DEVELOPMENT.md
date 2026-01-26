# Development Guide

## Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose (for PostgreSQL)
- Git
- VS Code (recommended)

## Quick Start

### 1. Clone & Install

```bash
# Clone repository
git clone https://github.com/evgeniynezivoy/quality-monitoring.git
cd quality-monitoring

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Start Database

```bash
# From project root
docker compose up -d postgres

# Verify it's running
docker compose ps
```

### 3. Configure Environment

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5450
DB_NAME=quality_monitoring
DB_USER=quality_user
DB_PASSWORD=dev_password

# JWT
JWT_SECRET=dev_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# Google Sheets (optional for dev)
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:3000
```

### 4. Initialize Database

```bash
# Connect to postgres
docker exec -it qm-postgres psql -U quality_user -d quality_monitoring

# Run schema (in psql)
\i /path/to/database/schema.sql

# Or from outside
docker exec -i qm-postgres psql -U quality_user -d quality_monitoring < database/schema.sql
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Database: localhost:5450

## Project Structure

### Backend

```
backend/
├── src/
│   ├── index.ts              # Entry point, server startup
│   ├── app.ts                # Fastify app configuration
│   ├── config/
│   │   ├── database.ts       # PostgreSQL connection pool
│   │   ├── google-sheets.ts  # Google Sheets API client
│   │   └── env.ts            # Environment variables
│   ├── routes/
│   │   ├── auth.routes.ts    # Authentication endpoints
│   │   ├── issues.routes.ts  # Issues CRUD
│   │   ├── dashboard.routes.ts # Analytics endpoints
│   │   ├── users.routes.ts   # User management
│   │   ├── sync.routes.ts    # Sync control
│   │   └── admin.routes.ts   # Admin operations
│   ├── services/
│   │   └── sync.service.ts   # Google Sheets sync logic
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── roles.ts          # Role-based filtering
│   ├── types/
│   │   ├── index.ts          # Shared types
│   │   └── fastify.d.ts      # Fastify type extensions
│   └── utils/
│       └── helpers.ts        # Utility functions
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Frontend

```
frontend/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Root component, routing
│   ├── components/
│   │   ├── ui/               # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── table.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx    # Top navigation
│   │   │   └── Sidebar.tsx   # Side navigation
│   │   └── ErrorBoundary.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx
│   │   ├── issues/
│   │   │   └── IssuesPage.tsx
│   │   └── admin/
│   │       └── AdminPage.tsx
│   ├── lib/
│   │   ├── api.ts            # Axios client + API functions
│   │   └── utils.ts          # Utility functions (cn, etc.)
│   ├── hooks/
│   │   └── useAuth.ts
│   └── types/
│       └── index.ts
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── Dockerfile
```

## Coding Guidelines

### TypeScript

- Use strict mode
- Define interfaces for all data structures
- Avoid `any` - use `unknown` if type is unclear
- Use const assertions for literals

```typescript
// Good
interface User {
  id: number;
  name: string;
  role: 'admin' | 'team_lead' | 'cc';
}

// Bad
const user: any = { ... };
```

### React Components

- Use functional components with hooks
- Keep components small and focused
- Use TanStack Query for data fetching
- Colocate related code

```typescript
// Good: Component with query
export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.overview,
  });

  if (isLoading) return <Loading />;
  return <Dashboard data={data} />;
}
```

### API Routes

- Use async/await
- Always handle errors
- Use role-based filtering middleware
- Return consistent response shapes

```typescript
// Good: Route with auth and error handling
fastify.get(
  '/api/issues',
  { preHandler: authenticate },
  async (request, reply) => {
    try {
      const roleFilter = buildRoleWhereClause(request.user);
      const result = await query(`SELECT * FROM issues WHERE ${roleFilter.clause}`, roleFilter.params);
      return reply.send({ data: result.rows });
    } catch (error) {
      return reply.status(500).send({ error: 'Database error' });
    }
  }
);
```

### Database Queries

- Use parameterized queries (prevent SQL injection)
- Use CTEs for complex queries
- Add appropriate indexes
- Use transactions for multiple writes

```typescript
// Good: Parameterized query
const result = await query(
  'SELECT * FROM issues WHERE source_id = $1 AND issue_date >= $2',
  [sourceId, startDate]
);

// Bad: String interpolation
const result = await query(`SELECT * FROM issues WHERE source_id = ${sourceId}`);
```

## Adding New Features

### Adding a New API Endpoint

1. Create or update route file in `backend/src/routes/`
2. Add types to `backend/src/types/`
3. Register route in `backend/src/app.ts`
4. Add API function in `frontend/src/lib/api.ts`
5. Use in component with TanStack Query

### Adding a New Page

1. Create component in `frontend/src/features/<feature>/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `Sidebar.tsx`
4. Create API functions if needed

### Adding a shadcn/ui Component

```bash
cd frontend
npx shadcn-ui@latest add <component-name>
```

## Testing

### Backend

```bash
cd backend

# Run tests
npm test

# Watch mode
npm run test:watch
```

### Frontend

```bash
cd frontend

# Type checking
npm run typecheck

# Lint
npm run lint

# Build check
npm run build
```

### Database Queries

```bash
# Connect to dev database
docker exec -it qm-postgres psql -U quality_user -d quality_monitoring

# Test query
SELECT * FROM issues LIMIT 10;
```

## Debugging

### Backend

1. Use `console.log` for quick debugging
2. Check Docker logs: `docker compose logs -f backend`
3. Use VS Code debugger with `launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/backend/src/index.ts",
  "runtimeArgs": ["-r", "ts-node/register"],
  "env": { "NODE_ENV": "development" }
}
```

### Frontend

1. Use React DevTools browser extension
2. Use TanStack Query DevTools (included)
3. Check browser console for errors
4. Use VS Code debugger for breakpoints

### Database

```bash
# Connect and explore
docker exec -it qm-postgres psql -U quality_user -d quality_monitoring

# Useful commands
\dt          # List tables
\d+ issues   # Describe table
\x           # Expanded display
```

## Git Workflow

### Branch Naming

- `feature/add-export-csv`
- `fix/sync-date-parsing`
- `refactor/dashboard-queries`

### Commit Messages

```
type(scope): description

- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- docs: Documentation
- style: Formatting
- test: Tests
```

### Pull Request

1. Create feature branch
2. Make changes
3. Test locally
4. Push and create PR
5. Request review
6. Merge after approval

## Common Issues

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill it
kill -9 <PID>
```

### Node Modules Issues

```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Check for errors
npm run typecheck

# Clear TypeScript cache
rm -rf node_modules/.cache
```

### Database Connection Failed

```bash
# Check if postgres is running
docker compose ps

# Restart postgres
docker compose restart postgres

# Check logs
docker compose logs postgres
```
