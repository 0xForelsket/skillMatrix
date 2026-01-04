# Deployment Configuration

Docker configuration for production deployment of Caliber.

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

Full stack with PostgreSQL, MinIO (S3), and the application.

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

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    restart: always
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-admin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-secure_password}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # MinIO Console
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
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
      # Point S3 to local MinIO
      S3_ENDPOINT: http://minio:9000 
      S3_REGION: us-east-1
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:-admin}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-secure_password}
      S3_BUCKET: caliber-uploads
      NEXTAUTH_URL: ${NEXTAUTH_URL:-http://localhost}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
    depends_on:
      db:
        condition: service_healthy
      minio:
        condition: service_healthy

volumes:
  pg_data:
  minio_data:
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

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data_dev:/data

volumes:
  pg_data_dev:
  minio_data_dev:
```

---

## Environment Variables

Create a `.env` file for local development:

```bash
# Database
DATABASE_URL=postgres://dev:dev@localhost:5432/caliber_dev

# S3 / MinIO
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
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

## Deployment Checklist

### Pre-Deployment

- [ ] Set strong passwords for `DB_PASSWORD`, `MINIO_ROOT_PASSWORD`
- [ ] Generate secure `NEXTAUTH_SECRET`
- [ ] Configure `NEXTAUTH_URL` to your production domain
- [ ] Create MinIO bucket `caliber-uploads`
- [ ] Run database migrations: `bun drizzle-kit push`
- [ ] Seed initial data if needed

### Network & Security

- [ ] Configure firewall to only expose ports 80/443
- [ ] Set up reverse proxy (nginx/Caddy) with SSL/TLS
- [ ] MinIO ports (9000/9001) should NOT be publicly accessible
- [ ] PostgreSQL port (5432) should NOT be publicly accessible

### Backup Strategy

```bash
# Database backup (run via cron)
docker exec caliber-db pg_dump -U admin caliber > backup_$(date +%Y%m%d).sql

# MinIO backup (sync to external storage)
docker exec caliber-minio mc mirror /data /backup
```

### Monitoring

- [ ] Set up health check endpoint monitoring
- [ ] Configure log aggregation (stdout → centralized logging)
- [ ] Set up alerts for container restarts

---

## Reverse Proxy (Optional)

Example Caddy configuration for HTTPS:

**`Caddyfile`**

```caddyfile
skills.yourcompany.com {
    reverse_proxy app:3000
}
```

Example nginx configuration:

**`nginx.conf`**

```nginx
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
