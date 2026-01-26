# Architecture

## System Overview

Quality Monitoring is a full-stack web application for tracking and analyzing quality issues across Campaign Coordinator teams.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    React + TypeScript + Vite                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │Dashboard │  │  Issues  │  │   Team   │  │  Admin   │            │
│  │  Page    │  │  Page    │  │   Page   │  │  Panel   │            │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘            │
│       │             │             │             │                   │
│       └─────────────┴─────────────┴─────────────┘                   │
│                           │                                         │
│                    TanStack Query                                   │
│                    (API Client)                                     │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ HTTP/REST
┌───────────────────────────┼─────────────────────────────────────────┐
│                           │                                         │
│                      BACKEND API                                    │
│                  Node.js + Fastify                                  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Routes Layer                            │   │
│  │  /auth/*  │  /api/issues/*  │  /api/dashboard/*  │  /api/*  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Middleware Layer                          │   │
│  │         authenticate()  │  buildRoleWhereClause()           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     Services Layer                           │   │
│  │              sync.service.ts (Google Sheets)                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────┐
│                      PostgreSQL                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  users   │  │  issues  │  │issue_sources │  │  sync_logs   │   │
│  └──────────┘  └──────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                     ┌──────┴──────┐
                     │             │
              ┌──────┴──────┐ ┌────┴─────┐
              │Google Sheets│ │ Bitrix24 │
              │  (5 sheets) │ │ (future) │
              └─────────────┘ └──────────┘
```

## Data Flow

### 1. Google Sheets Sync Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Cron Job  │────▶│ Sync Service│────▶│Google Sheets│────▶│  PostgreSQL │
│ (10 min)    │     │             │     │    API      │     │   (upsert)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  sync_logs  │
                    │  (audit)    │
                    └─────────────┘
```

**Steps:**
1. Cron triggers sync every 10 minutes
2. Sync service fetches active sources from `issue_sources`
3. For each source, fetch data from Google Sheets API
4. Normalize column names (different sheets have different headers)
5. Generate row hash for deduplication
6. Upsert into `issues` table
7. Link issues to users by matching `responsible_cc_name` → `users.full_name`
8. Log results to `sync_logs`

### 2. Dashboard Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  API Route  │────▶│Role Filter  │────▶│ PostgreSQL  │
│ (useQuery)  │     │             │     │(WHERE clause│     │  (query)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                                           │
       │                                                           │
       └───────────────────────────────────────────────────────────┘
                              JSON response
```

**Role-based filtering:**
- **Admin**: No filter, sees all data
- **Team Lead**: `WHERE users.team_lead_id = :userId`
- **CC**: `WHERE issues.responsible_cc_id = :userId`

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   └── table.tsx
│   ├── layout/
│   │   ├── Header.tsx         # Top navigation bar
│   │   └── Sidebar.tsx        # Left navigation menu
│   ├── data-table/
│   │   └── DataTable.tsx      # Reusable table with pagination
│   └── ErrorBoundary.tsx      # Error handling wrapper
├── features/
│   ├── auth/
│   │   └── LoginPage.tsx
│   ├── dashboard/
│   │   └── DashboardPage.tsx  # Main analytics page
│   ├── issues/
│   │   └── IssuesPage.tsx     # Issues list with filters
│   └── admin/
│       └── AdminPage.tsx      # User management, sync status
├── lib/
│   ├── api.ts                 # Axios client + API functions
│   └── utils.ts               # Helper functions
└── hooks/
    └── useAuth.ts             # Authentication hook
```

### Backend Routes

```
src/routes/
├── auth.routes.ts             # /auth/* - Login, logout, me
├── issues.routes.ts           # /api/issues/* - CRUD operations
├── dashboard.routes.ts        # /api/dashboard/* - Analytics endpoints
├── users.routes.ts            # /api/users/* - User listing
├── sync.routes.ts             # /api/sync/* - Sync control
└── admin.routes.ts            # /api/admin/* - Admin operations
```

## Security Architecture

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│  Verify  │────▶│ Generate │────▶│  Return  │
│ Request  │     │ Password │     │   JWT    │     │  Tokens  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │
                                        ▼
                                 ┌──────────────┐
                                 │ access_token │ (7 days)
                                 │refresh_token │ (stored)
                                 └──────────────┘
```

### Authorization Middleware

```typescript
// middleware/auth.ts
export async function authenticate(request, reply) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET);
  request.user = await getUserById(decoded.userId);
}

// middleware/roles.ts
export function buildRoleWhereClause(user) {
  if (user.role === 'admin') return { clause: '1=1', params: [] };
  if (user.role === 'team_lead') return { clause: 'u.team_lead_id = $1', params: [user.id] };
  return { clause: 'i.responsible_cc_id = $1', params: [user.id] };
}
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS (37.27.5.172)                       │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Docker Compose                        │   │
│  │                                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │  frontend    │  │   backend    │  │   postgres   │  │   │
│  │  │  (nginx)     │  │  (node:20)   │  │   (pg:15)    │  │   │
│  │  │  :8080       │  │  :3000       │  │  :5450       │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │         │                 │                 │          │   │
│  │         └─────────────────┴─────────────────┘          │   │
│  │                    docker network                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Database Indexes
- `idx_issues_date` - For date range queries
- `idx_issues_source` - For source filtering
- `idx_issues_cc` - For CC-based queries
- `idx_issues_rate` - For severity filtering

### Caching Strategy
- TanStack Query with 5-minute stale time for dashboard data
- No server-side caching (data changes frequently)

### Query Optimization
- All dashboard queries use CTEs for date ranges
- Aggregations done at database level
- Role filtering in WHERE clause (not application layer)
