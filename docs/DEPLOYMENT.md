# Deployment Guide

## Production Environment

| Service | URL | Port |
|---------|-----|------|
| Frontend | http://37.27.5.172:8080 | 8080 |
| Backend API | http://37.27.5.172:3000 | 3000 |
| PostgreSQL | 37.27.5.172:5450 | 5450 |

## Prerequisites

- VPS with Ubuntu 22.04+ or similar Linux
- Docker Engine 24+
- Docker Compose v2+
- Git
- 2GB+ RAM recommended

## Initial Server Setup

### 1. Install Docker

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### 2. Clone Repository

```bash
cd /opt
git clone https://github.com/evgeniynezivoy/quality-monitoring.git
cd quality-monitoring
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

**Required environment variables:**

```env
# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=quality_monitoring
DB_USER=quality_user
DB_PASSWORD=YOUR_SECURE_PASSWORD

# JWT
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=7d

# Google Sheets API
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Frontend
VITE_API_URL=http://YOUR_SERVER_IP:3000
```

### 4. Start Services

```bash
# Build and start all containers
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 5. Initialize Database

```bash
# Run schema
docker exec -i qm-postgres psql -U quality_user -d quality_monitoring < database/schema.sql

# Insert initial sources
docker exec -i qm-postgres psql -U quality_user -d quality_monitoring << 'EOF'
INSERT INTO issue_sources (name, display_name, google_sheet_id, sheet_gid) VALUES
('LV', 'LV Issues', '1DawUmZgEKtFnu9nDs6Oo4APZkvENar351oyCyb0C__I', '0'),
('CS', 'CS Issues', '1Oslo3ZNuzFgXbDCIIj9m_uFIbWpw0x97M9CjxLWozD0', '0'),
('Block', 'Block Issues', '13TpypRYuC3t0AN_rJAiglsJ0oioysz79dQm1ojsYcEE', '0'),
('CDT_CW', 'CDT/CW Issues', '1S45EyniKYCe550M6inZXL7jzKvNJR22H-beX5BLiIoM', '0'),
('QA', 'QA Issues', '1boJ69H1jq5zOHHStvxlHD5qYWSJ_JhAqFl1GHzwY1I0', '1250110979');
EOF
```

## Docker Compose Configuration

`docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: qm-postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-quality_monitoring}
      POSTGRES_USER: ${DB_USER:-quality_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5450:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-quality_user}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    container_name: qm-backend
    environment:
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-quality_monitoring}
      DB_USER: ${DB_USER:-quality_user}
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-7d}
      GOOGLE_SERVICE_ACCOUNT_EMAIL: ${GOOGLE_SERVICE_ACCOUNT_EMAIL}
      GOOGLE_PRIVATE_KEY: ${GOOGLE_PRIVATE_KEY}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: ${VITE_API_URL:-http://localhost:3000}
    container_name: qm-frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  postgres_data:
```

## Updating Production

### Standard Update

```bash
cd /opt/quality-monitoring

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose up -d --build

# Check logs
docker compose logs -f --tail=100
```

### Quick Frontend-Only Update

```bash
git pull origin main
docker compose up -d --build frontend
```

### Quick Backend-Only Update

```bash
git pull origin main
docker compose up -d --build backend
```

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Last 100 lines
docker compose logs --tail=100 backend
```

### Check Container Status

```bash
# List containers
docker compose ps

# Resource usage
docker stats
```

### Health Check

```bash
# Backend health
curl http://localhost:3000/health

# API check
curl http://localhost:3000/api/sync/status

# Database check
docker exec qm-postgres pg_isready -U quality_user
```

## Backup & Restore

### Database Backup

```bash
# Create backup
docker exec qm-postgres pg_dump -U quality_user quality_monitoring > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backup (cron)
0 2 * * * docker exec qm-postgres pg_dump -U quality_user quality_monitoring > /opt/backups/qm_$(date +\%Y\%m\%d).sql
```

### Database Restore

```bash
# Stop backend to prevent writes
docker compose stop backend

# Restore from backup
docker exec -i qm-postgres psql -U quality_user -d quality_monitoring < backup.sql

# Restart backend
docker compose start backend
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker compose logs backend

# Check environment
docker compose config

# Rebuild from scratch
docker compose down
docker compose up -d --build --force-recreate
```

### Database Connection Issues

```bash
# Test connection
docker exec qm-backend node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => console.log('OK')).catch(console.error);
"

# Check postgres logs
docker compose logs postgres
```

### Sync Not Working

```bash
# Manual sync trigger
curl -X POST http://localhost:3000/api/sync/trigger

# Check sync logs
docker exec qm-postgres psql -U quality_user -d quality_monitoring -c "
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10;
"
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Remove old logs
docker compose logs --no-log-prefix backend > /dev/null
```

## Security Recommendations

### Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 8080/tcp # Frontend
sudo ufw allow 3000/tcp # Backend API
sudo ufw enable
```

### SSL/HTTPS (Optional)

For production, consider adding nginx reverse proxy with Let's Encrypt:

```bash
# Install nginx and certbot
sudo apt install nginx certbot python3-certbot-nginx

# Configure nginx as reverse proxy
# Then obtain SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Database Security

- Change default PostgreSQL port (5450 instead of 5432)
- Use strong passwords
- Consider disabling external database access if not needed

## Scaling Considerations

For high load scenarios:

1. **Horizontal scaling**: Run multiple backend instances behind load balancer
2. **Database**: Consider read replicas for heavy read loads
3. **Caching**: Add Redis for session storage and query caching
4. **CDN**: Serve frontend static files from CDN
