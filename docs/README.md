# Caliber - Skill Matrix System

A comprehensive skill tracking and certification management system designed for manufacturing environments.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Runtime:** Bun
- **Database:** PostgreSQL 16 + Drizzle ORM
- **File Storage:** RustFS (S3-compatible, Apache 2.0 licensed)
- **UI:** Shadcn UI, Tailwind CSS, Lucide React
- **Linting:** Biome
- **Testing:** Vitest (unit), Playwright (E2E)

## Documentation

| Document | Description |
|----------|-------------|
| [Schema](./schema.md) | Complete Drizzle schema, ERD, [Gap Analysis SQL](./schema.md#gap-analysis-sql-query), audit logging |
| [Roadmap](./roadmap.md) | 7-phase implementation plan with checklists |
| [Deployment](./deployment.md) | Docker configs, RustFS setup, backup strategy |
| [Auth Architecture](./auth-architecture.md) | Users vs Employees, RBAC, badge-based identification |
| [Data Migration](./data-migration.md) | Patterns for department merges, skill changes, bulk imports |
| [Internationalization](./i18n.md) | Multi-language support with next-intl |

## Key Features

### Core
- **Multi-Site Support:** Scope skills, employees, and requirements by site
- **Version-Controlled Skills:** Track skill revisions with retraining requirements
- **Flexible Requirements:** Define skill requirements by site, department, role, or project
- **Multi-Level Skills:** Track achievement levels (e.g., Level 1, 2, 3)

### Operations
- **Gap Analysis:** Identify missing, outdated, expiring, or insufficient-level skills
- **QR Badge Scanning:** Public skill viewer accessible via QR code (no login required)
- **Quick Certify:** Trainers can certify workers via badge scan
- **Revocation:** Properly revoke certifications with reason and audit trail

### Compliance
- **Audit Logging:** Full audit trail of all changes (who, what, when, old/new values)
- **Soft Deletes:** Never lose data; all deletions are recoverable
- **Offline-First:** Works on factory floor with limited connectivity
- **RBAC:** Role-based access for Admin, Trainer, Auditor, Viewer

## Quick Start

```bash
# Install dependencies
bun install

# Start local services (Postgres + RustFS)
docker compose up -d

# Create S3 bucket
aws --endpoint-url http://localhost:9000 s3 mb s3://caliber-uploads

# Run migrations
bun run db:push

# Seed database
bun run db:seed

# Start dev server
bun run dev
```

## Project Structure

```
src/
├── app/
│   ├── (public)/
│   │   └── b/[badgeToken]/     # Public badge skill viewer
│   ├── admin/
│   │   ├── employees/          # Employee management
│   │   ├── skills/             # Skill catalog
│   │   ├── matrix/             # Skill matrix view
│   │   └── users/              # User management
│   ├── api/
│   │   └── auth/               # NextAuth routes
│   └── login/                  # Login page
├── db/
│   ├── schema.ts               # Drizzle schema
│   └── helpers.ts              # Query helpers (soft delete, etc.)
├── lib/
│   ├── auth/
│   │   └── permissions.ts      # RBAC helpers
│   ├── id.ts                   # UUIDv7 generation
│   ├── token.ts                # Badge token generation
│   └── audit.ts                # Audit logging
├── server/
│   └── services/
│       └── gap-analysis.ts     # Core business logic
└── components/
    └── ui/                     # Shadcn components
```

## Entity Relationships

```
┌─────────┐     ┌─────────────┐     ┌────────────────┐
│  Sites  │────▶│  Employees  │────▶│ Employee Skills│
└─────────┘     └─────────────┘     └────────────────┘
                      │                     │
                      ▼                     ▼
               ┌────────────┐         ┌──────────┐
               │   Users    │         │  Skills  │
               │  (login)   │         │(catalog) │
               └────────────┘         └──────────┘
                     │                      │
                     ▼                      ▼
              ┌────────────┐         ┌────────────┐
              │ Audit Logs │         │ Revisions  │
              └────────────┘         └────────────┘
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgres://dev:dev@localhost:5432/caliber_dev

# S3 / RustFS (Apache 2.0 licensed alternative to MinIO)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=rustfsadmin
S3_SECRET_KEY=rustfsadmin
S3_BUCKET=caliber-uploads

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

## Why RustFS over MinIO?

MinIO changed their license to AGPL-3.0 in 2024, which has implications for commercial/on-prem deployments. RustFS is:

- **Apache 2.0 licensed** — no copyleft concerns
- **Faster** — up to 2.3x for small objects (Rust vs Go)
- **S3 compatible** — drop-in replacement
- **Memory safe** — Rust's guarantees

## Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run lint         # Run Biome linter
bun run test         # Run unit tests
bun run test:e2e     # Run E2E tests
bun run db:seed      # Seed database with sample data
bun run db:push      # Push schema changes
bun run db:generate  # Generate migrations
```

## License

MIT
