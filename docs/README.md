# Caliber - Skill Matrix System

A comprehensive skill tracking and certification management system designed for manufacturing environments.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Runtime:** Bun
- **Database:** PostgreSQL 16 + Drizzle ORM
- **File Storage:** MinIO (S3-compatible)
- **UI:** Shadcn UI, Tailwind CSS, Lucide React
- **Linting:** Biome

## Documentation

| Document | Description |
|----------|-------------|
| [Schema](./schema.md) | Complete Drizzle database schema with all tables and relations |
| [Roadmap](./roadmap.md) | Phased implementation plan (Weeks 1-5) |
| [Deployment](./deployment.md) | Docker configuration for production |

## Key Features

- **Multi-Site Support:** Scope skills, employees, and requirements by site
- **Version-Controlled Skills:** Track skill revisions with retraining requirements
- **Flexible Requirements:** Define skill requirements by site, department, role, or project
- **Gap Analysis:** Identify missing, outdated, or expiring skills
- **QR Badge Scanning:** Public skill viewer accessible via QR code (no login required)
- **Offline-First:** Works on factory floor with limited connectivity
- **RBAC:** Role-based access for Admin, Trainer, Auditor, Viewer

## Quick Start

```bash
# Install dependencies
bun install

# Start local services (Postgres + MinIO)
docker compose up -d

# Run migrations
bun drizzle-kit push

# Seed database
bun run seed

# Start dev server
bun run dev
```

## Entity Relationships

```
┌─────────┐     ┌─────────────┐     ┌────────────┐
│  Sites  │────▶│  Employees  │────▶│ Emp Skills │
└─────────┘     └─────────────┘     └────────────┘
                      │                    │
                      ▼                    ▼
               ┌────────────┐       ┌────────────┐
               │   Users    │       │   Skills   │
               │  (login)   │       │ (catalog)  │
               └────────────┘       └────────────┘
                                          │
                                          ▼
                                   ┌────────────┐
                                   │ Revisions  │
                                   └────────────┘
```
