# Deployment Configuration

Docker configuration for production deployment of Caliber.

> **Note:** We use [RustFS](https://rustfs.com) for S3-compatible object storage instead of MinIO due to MinIO's recent license change to AGPL. RustFS is Apache 2.0 licensed, faster, and built with Rust.

---

## Production Dockerfile

Optimized multi-stage build for Bun + Next.js.

**`Dockerfile.prod`**

```dockerfile
# 1. Base
FROM oven/bun:1 AS base
WORKDIR /app

# 2. Dependencies
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# 3. Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN bun run build

# 4. Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["bun", "server.js"]
```

---

## Docker Compose (Production)

Full stack with PostgreSQL, RustFS (S3), and the application.

**`docker-compose.prod.yml`**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-secure_password}
      POSTGRES_DB: caliber
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U admin -d caliber"]
      interval: 10s
      timeout: 5s
      retries: 5

  rustfs:
    image: rustfs/rustfs:latest
    command: server /data --address ":9000" --console-address ":9001"
    restart: always
    environment:
      RUSTFS_ROOT_USER: ${RUSTFS_ROOT_USER:-admin}
      RUSTFS_ROOT_PASSWORD: ${RUSTFS_ROOT_PASSWORD:-secure_password}
    volumes:
      - rustfs_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
      interval: 30s
      timeout: 20s
      retries: 3

  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "80:3000"
    environment:
      DATABASE_URL: postgres://admin:${DB_PASSWORD:-secure_password}@db:5432/caliber
      # Point S3 to local RustFS
      S3_ENDPOINT: http://rustfs:9000 
      S3_REGION: us-east-1
      S3_ACCESS_KEY: ${RUSTFS_ROOT_USER:-admin}
      S3_SECRET_KEY: ${RUSTFS_ROOT_PASSWORD:-secure_password}
      S3_BUCKET: caliber-uploads
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
      rustfs:
        condition: service_healthy

volumes:
  pg_data:
  rustfs_data:
```

---

## Docker Compose (Development)

Lighter configuration for local development.

**`docker-compose.yml`**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: caliber_dev
    ports:
      - "5432:5432"
    volumes:
      - pg_data_dev:/var/lib/postgresql/data

  rustfs:
    image: rustfs/rustfs:latest
    command: server /data --address ":9000" --console-address ":9001"
    environment:
      RUSTFS_ROOT_USER: rustfsadmin
      RUSTFS_ROOT_PASSWORD: rustfsadmin
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web Console
    volumes:
      - rustfs_data_dev:/data

volumes:
  pg_data_dev:
  rustfs_data_dev:
```

---

## Environment Variables

Create a `.env` file for local development:

```bash
# Database
DATABASE_URL=postgres://dev:dev@localhost:5432/caliber_dev

# S3 / RustFS
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=caliber-uploads

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

---

## RustFS vs MinIO

| Aspect | RustFS | MinIO |
|--------|--------|-------|
| **License** | Apache 2.0 ✅ | AGPL-3.0 (since 2024) |
| **Language** | Rust | Go |
| **Performance** | Up to 2.3x faster (small objects) | Baseline |
| **S3 Compatibility** | Full | Full |
| **Memory Safety** | Rust guarantees | Go GC |

For commercial/on-prem deployments, RustFS avoids the AGPL licensing concerns.

---

## Create S3 Bucket on Startup

Add this init script or run manually after first deploy:

**Option 1: Using AWS CLI**
```bash
# Configure AWS CLI to point to RustFS
aws configure set aws_access_key_id rustfsadmin
aws configure set aws_secret_access_key rustfsadmin
aws configure set region us-east-1

# Create bucket
aws --endpoint-url http://localhost:9000 s3 mb s3://caliber-uploads
```

**Option 2: Using RustFS CLI (if available)**
```bash
rustfs-cli bucket create caliber-uploads
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Set strong passwords for `DB_PASSWORD`, `RUSTFS_ROOT_PASSWORD`
- [ ] Generate secure `NEXTAUTH_SECRET`
- [ ] Configure `NEXTAUTH_URL` to your production domain
- [ ] Create RustFS bucket `caliber-uploads`
- [ ] Run database migrations: `bun drizzle-kit push`
- [ ] Apply `updated_at` trigger (see `docs/schema.md`)
- [ ] Seed initial data if needed

### Network & Security

- [ ] Configure firewall to only expose ports 80/443
- [ ] Set up reverse proxy (nginx/Caddy) with SSL/TLS
- [ ] RustFS ports (9000/9001) should NOT be publicly accessible
- [ ] PostgreSQL port (5432) should NOT be publicly accessible

### Database Maintenance

**Daily Backup (add to cron):**
```bash
#!/bin/bash
# /etc/cron.daily/caliber-backup

BACKUP_DIR="/var/backups/caliber"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
docker exec caliber-db pg_dump -U admin caliber | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# RustFS backup (sync to external storage)
docker exec caliber-rustfs rustfs-cli mirror /data /backup

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete
```

**Weekly VACUUM:**
```bash
docker exec caliber-db psql -U admin -d caliber -c "VACUUM ANALYZE;"
```

### Monitoring

- [ ] Set up health check endpoint monitoring
- [ ] Configure log aggregation (stdout → centralized logging)
- [ ] Set up alerts for container restarts
- [ ] Monitor disk usage for RustFS volume

---

## Reverse Proxy (Optional)

Example Caddy configuration for HTTPS:

**`Caddyfile`**

```caddyfile
skills.yourcompany.com {
    reverse_proxy app:3000
    
    # Rate limiting for public badge pages
    @badge path /b/*
    rate_limit @badge {
        zone badge_zone {
            key {remote_host}
            events 30
            window 1m
        }
    }
}
```

Example nginx configuration:

**`nginx.conf`**

```nginx
# Rate limiting zone for badge pages
limit_req_zone $binary_remote_addr zone=badge:10m rate=30r/m;

server {
    listen 80;
    server_name skills.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name skills.yourcompany.com;

    ssl_certificate /etc/ssl/certs/skills.crt;
    ssl_certificate_key /etc/ssl/private/skills.key;

    # Rate limit public badge pages
    location /b/ {
        limit_req zone=badge burst=10 nodelay;
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting

### RustFS Won't Start

```bash
# Check logs
docker logs caliber-rustfs

# Common issues:
# - Permission denied on /data → check volume ownership
# - Port in use → change host port mapping
```

### Database Connection Refused

```bash
# Wait for postgres to be ready
docker exec caliber-db pg_isready -U admin

# Check connection string
docker exec caliber-app env | grep DATABASE_URL
```

### S3 Upload Fails

```bash
# Test S3 connection from app container
docker exec caliber-app curl http://rustfs:9000/health

# Check bucket exists
aws --endpoint-url http://localhost:9000 s3 ls
```
