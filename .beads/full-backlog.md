# Caliber Skill Matrix - Complete Issue Backlog

This file defines the complete issue structure for implementing the Caliber skill matrix system.
Issues are organized by phase with clear dependencies.

**Import with:** `bd create -f .beads/full-backlog.md`

---

## EPIC: Phase 1 - Foundation & DevOps

- type: epic
- priority: 0
- labels: foundation, devops, phase-1

### Description

Set up the development environment, database, and core infrastructure.
This is the foundation that all other work depends on.

### Background & Context

Before any features can be built, we need:
- A working Next.js application with proper tooling
- PostgreSQL database with our schema
- RustFS for file storage (S3-compatible)
- Seeding scripts for consistent dev environments
- Audit logging infrastructure

These are blocking requirements - nothing else can proceed without them.

### Success Criteria

- [ ] `bun run dev` starts the application
- [ ] Database is reachable and schema is applied
- [ ] RustFS bucket exists and is accessible
- [ ] Seed script populates test data
- [ ] Audit logging captures changes

---

## Task: Initialize Next.js Project

- type: task
- priority: 0
- labels: foundation, setup
- estimate: 60

### Description

Create the Next.js 15 project with App Router, Bun runtime, and essential tooling.

### Subtasks

- [ ] Run `bunx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir`
- [ ] Replace ESLint with Biome (`bun add -D @biomejs/biome`)
- [ ] Configure `biome.json` with project standards
- [ ] Install Shadcn UI (`bunx shadcn@latest init`)
- [ ] Add Lucide React icons
- [ ] Configure `tsconfig.json` with `strict: true`
- [ ] Create `.env.example` with all required variables
- [ ] Set up path aliases (`@/` for `src/`)

### Acceptance Criteria

```gherkin
Given a fresh clone of the repository
When I run `bun install && bun run dev`
Then the app starts on localhost:3000
And TypeScript strict mode is enabled
And Biome linting passes
```

---

## Task: Docker Compose Setup

- type: task
- priority: 0
- labels: foundation, docker, database
- estimate: 45

### Description

Create Docker Compose configuration for local development with PostgreSQL and RustFS.

### Subtasks

- [ ] Create `docker-compose.yml` with Postgres 16 and RustFS 0.9.2
- [ ] Configure persistent volumes for data
- [ ] Set up health checks
- [ ] Create `docker-compose.prod.yml` for production
- [ ] Document startup commands in README
- [ ] Add `.dockerignore` file

### Acceptance Criteria

```gherkin
Given Docker is installed
When I run `docker compose up -d`
Then PostgreSQL is available on localhost:5432
And RustFS is available on localhost:9000
And data persists across restarts
```

---

## Task: Drizzle ORM Configuration

- type: task
- priority: 0
- labels: foundation, database, orm
- estimate: 60

### Description

Set up Drizzle ORM with PostgreSQL connection and configuration.

### Subtasks

- [ ] Install `drizzle-orm` and `drizzle-kit`
- [ ] Install `postgres` driver
- [ ] Create `drizzle.config.ts`
- [ ] Create `src/db/index.ts` with database client
- [ ] Create `src/db/schema.ts` (placeholder)
- [ ] Add `db:push`, `db:generate`, `db:studio` scripts to package.json
- [ ] Test connection to Docker Postgres

### Acceptance Criteria

```gherkin
Given Docker Compose is running
When I run `bun run db:studio`
Then Drizzle Studio opens and shows the database
```

---

## Task: Core Database Schema

- type: task
- priority: 0
- labels: foundation, database, schema
- estimate: 120

### Description

Implement the complete database schema from docs/schema.md including all tables,
indexes, and constraints.

### Subtasks

- [ ] Create `sites` table
- [ ] Create `departments` table
- [ ] Create `roles` table (job titles)
- [ ] Create `projects` table
- [ ] Create `users` table (authentication)
- [ ] Create `employees` table (business entity)
- [ ] Create `skills` table
- [ ] Create `skillRevisions` table
- [ ] Create `skillRequirements` table
- [ ] Create `employeeSkills` table
- [ ] Create `attachments` table
- [ ] Create `skillRevisionDocuments` table
- [ ] Create `employeeSkillEvidence` table
- [ ] Create `auditLogs` table
- [ ] Define all relations
- [ ] Add all indexes
- [ ] Run `bun run db:push` to apply

### Acceptance Criteria

```gherkin
Given the schema is defined
When I run `bun run db:push`
Then all tables are created in PostgreSQL
And foreign keys are properly configured
And indexes exist for performance
```

---

## Task: Database Triggers

- type: task
- priority: 1
- labels: foundation, database
- estimate: 30

### Description

Create PostgreSQL triggers for automatic `updated_at` timestamps.

### Subtasks

- [ ] Create `trigger_set_updated_at()` function
- [ ] Apply trigger to all tables with `updated_at` column
- [ ] Create migration file for triggers
- [ ] Test that updates automatically set timestamp

### Acceptance Criteria

```gherkin
Given a record exists
When I update any field
Then updated_at is automatically set to NOW()
```

---

## Task: UUIDv7 Utility

- type: task
- priority: 0
- labels: foundation, utilities
- estimate: 20

### Description

Create utility for generating UUIDv7 identifiers (sortable, globally unique).

### Subtasks

- [ ] Install `uuidv7` package
- [ ] Create `src/lib/id.ts` with `generateId()` function
- [ ] Add JSDoc explaining UUIDv7 benefits
- [ ] Export type for ID (branded string)

### Acceptance Criteria

```gherkin
Given I call generateId() multiple times
Then each ID is unique
And IDs sort chronologically
And format matches UUIDv7 spec
```

---

## Task: Soft Delete Helper

- type: task
- priority: 1
- labels: foundation, database, utilities
- estimate: 30

### Description

Create reusable helpers for soft delete patterns (filtering by `deleted_at IS NULL`).

### Subtasks

- [ ] Create `src/db/helpers.ts`
- [ ] Implement `withActive(table)` filter function
- [ ] Implement `notDeleted` SQL helper
- [ ] Create `softDelete(table, id)` function
- [ ] Add JSDoc and examples

### Acceptance Criteria

```gherkin
Given records with some deleted_at values set
When I query with withActive(employees)
Then only non-deleted records are returned
```

---

## Task: Seed Script

- type: task
- priority: 1
- labels: foundation, database, dev-tools
- estimate: 90

### Description

Create comprehensive seed script that populates test data for all features.

### Subtasks

- [ ] Create `src/db/seed.ts`
- [ ] Add 2 sites (Austin, Detroit)
- [ ] Add 4 departments (Production, Quality, Maintenance, HR)
- [ ] Add 5 roles (Operator L1/L2, Technician, Lead, Supervisor)
- [ ] Add 5 users (admin, skill_manager, 2 trainers, auditor)
- [ ] Add 10 employees (5 linked to users, 5 badge-only)
- [ ] Add 5 skills with revisions
- [ ] Add skill requirements at various scopes
- [ ] Add employee skills covering all gap analysis states
- [ ] Add `db:seed` script to package.json
- [ ] Log summary after seeding

### Acceptance Criteria

```gherkin
Given an empty database with schema
When I run `bun run db:seed`
Then all test data is created
And I can log in as admin@caliber.local
And gap analysis shows all status types
```

---

## Task: Audit Logging Service

- type: task
- priority: 1
- labels: foundation, audit, compliance
- estimate: 60

### Description

Create the audit logging service for tracking all data changes.

### Subtasks

- [ ] Create `src/lib/audit.ts`
- [ ] Implement `logAudit(action, entityType, entityId, oldValue, newValue)` function
- [ ] Capture userId from session (null for system actions)
- [ ] Capture IP address and user agent when available
- [ ] Add type definitions for audit actions
- [ ] Create helper for Server Action integration

### Acceptance Criteria

```gherkin
Given a user creates an employee
When the operation completes
Then an audit log entry exists with:
  - action: 'create'
  - entityType: 'employee'
  - entityId: the new ID
  - newValue: the created data
  - userId: who did it
```

---

## EPIC: Phase 2 - Core Business Logic

- type: epic
- priority: 0
- labels: core, business-logic, phase-2

### Description

Implement the core business logic before building UI. This ensures the "brain"
of the system is solid and well-tested before we add the visual layer.

### Background & Context

The gap analysis is the heart of the skill matrix system. It answers:
"What skills does this employee need, and which are missing/expiring/outdated?"

Getting this right is critical. We implement and thoroughly test it before
building any UI that depends on it.

### Success Criteria

- [ ] Gap analysis returns correct status for all scenarios
- [ ] Requirement matching respects scope hierarchy
- [ ] Expiration dates are calculated correctly
- [ ] All edge cases have unit tests

---

## Task: Gap Analysis Service

- type: task
- priority: 0
- labels: core, gap-analysis, critical
- estimate: 180

### Description

Implement the core gap analysis query that identifies skill gaps for employees.

### Background

The gap analysis determines each employee's skill status:
- **MISSING**: Required skill not certified
- **OUTDATED**: Certified on archived revision
- **INSUFFICIENT_LEVEL**: Has Level 1, needs Level 2
- **EXPIRING_SOON**: Expires within 30 days
- **VALID**: All good

### Subtasks

- [ ] Create `src/server/services/gap-analysis.ts`
- [ ] Implement raw SQL query from docs/schema.md
- [ ] Create TypeScript wrapper with typed result
- [ ] Handle null validityMonths (never expires)
- [ ] Handle revoked certifications
- [ ] Add configurable expiry window (default 30 days)
- [ ] Create unit tests for all scenarios:
  - Employee with no certifications → MISSING
  - Certified on archived revision → OUTDATED
  - Insufficient level → INSUFFICIENT_LEVEL
  - Expires in 15 days → EXPIRING_SOON
  - Valid certification → VALID
  - Revoked certification → MISSING

### Acceptance Criteria

```gherkin
Given seed data with Employee E who has Level 1, needs Level 2
When I call getEmployeeGaps(employeeE.id)
Then the result includes INSUFFICIENT_LEVEL for that skill
```

---

## Task: Requirement Matcher

- type: task
- priority: 1
- labels: core, requirements
- estimate: 90

### Description

Create function to resolve which requirements apply to a given employee
based on their site, department, role, and project assignments.

### Background

Requirements can be scoped at multiple levels:
- Global (all nulls) → Everyone
- Site-specific → Everyone at that site
- Department-specific → Everyone in that department
- Role-specific → Everyone with that job title
- Project-specific → Everyone assigned to that project

An employee might match multiple requirements for the same skill at different
scopes. We need to collect all applicable requirements.

### Subtasks

- [ ] Create `getRequirementsForEmployee(employeeId)` function
- [ ] Query requirements matching employee's scope
- [ ] Handle OR logic (any matching scope applies)
- [ ] Return unique skill requirements (deduplicate)
- [ ] Add unit tests for scope combinations

### Acceptance Criteria

```gherkin
Given a requirement "Safety" scoped to site="Austin"
And an employee at site="Austin", department="Production"
When I call getRequirementsForEmployee(employee.id)
Then "Safety" is included in the requirements
```

---

## Task: Expiration Calculator

- type: task
- priority: 1
- labels: core, utilities
- estimate: 30

### Description

Create utility to calculate certification expiration dates.

### Subtasks

- [ ] Create `calculateExpiresAt(skill, achievedAt)` function
- [ ] Handle null validityMonths (returns null = never expires)
- [ ] Handle edge cases (leap years, month boundaries)
- [ ] Add unit tests

### Acceptance Criteria

```gherkin
Given a skill with validityMonths=12
And achievedAt="2026-03-15"
When I call calculateExpiresAt(skill, achievedAt)
Then it returns "2027-03-15"
```

---

## EPIC: Phase 3 - Administrative UI

- type: epic
- priority: 1
- labels: admin, ui, phase-3

### Description

Build the administrative interface for HR and admins to manage employees,
skills catalog, and requirements.

### Success Criteria

- [ ] Employees can be created, viewed, edited
- [ ] Skills catalog can be managed with revisions
- [ ] File uploads work for evidence and SOPs
- [ ] All actions have proper validation and error handling

---

## Task: Layout and Navigation

- type: task
- priority: 1
- labels: ui, navigation
- estimate: 60

### Description

Create the admin layout with sidebar navigation and header.

### Subtasks

- [ ] Create `src/app/admin/layout.tsx`
- [ ] Create sidebar component with nav links
- [ ] Add user menu with logout
- [ ] Add breadcrumb component
- [ ] Create responsive mobile navigation
- [ ] Apply consistent styling

### Acceptance Criteria

```gherkin
Given I am logged in
When I view any admin page
Then I see the sidebar with navigation
And I can navigate between sections
And it works on mobile
```

---

## Task: Employees List Page

- type: task
- priority: 1
- labels: ui, employees
- estimate: 120

### Description

Create the employees list page with data table, filters, and actions.

### Subtasks

- [ ] Create `src/app/admin/employees/page.tsx`
- [ ] Create data table with Shadcn DataTable
- [ ] Add columns: name, employee number, site, department, role, status
- [ ] Add filters: site, department, status
- [ ] Add search by name or employee number
- [ ] Add "Add Employee" button opening dialog
- [ ] Add row actions: view, edit
- [ ] Implement pagination
- [ ] Fetch data with Server Components

### Acceptance Criteria

```gherkin
Given I am logged in as admin
When I navigate to /admin/employees
Then I see a table of all active employees
And I can filter by site or department
And I can search by name
```

---

## Task: Employee Detail Page

- type: task
- priority: 1
- labels: ui, employees
- estimate: 90

### Description

Create the employee detail page showing their info and skills.

### Subtasks

- [ ] Create `src/app/admin/employees/[id]/page.tsx`
- [ ] Display employee header (name, photo, badge QR)
- [ ] Display employee info (site, department, role, status)
- [ ] Create tabs: Skills, History, Documents
- [ ] Skills tab: list with gap analysis status
- [ ] History tab: audit log for this employee
- [ ] Add "Edit" button
- [ ] Add "Download Badge QR" button
- [ ] Add "Regenerate Badge" action

### Acceptance Criteria

```gherkin
Given an employee exists
When I navigate to /admin/employees/{id}
Then I see their full profile
And I see their skills with status indicators
```

---

## Task: Employee Create/Edit Form

- type: task
- priority: 1
- labels: ui, employees, forms
- estimate: 90

### Description

Create the form for creating and editing employees.

### Subtasks

- [ ] Create `src/components/employees/employee-form.tsx`
- [ ] Add fields: name, employee number, email, site, department, role
- [ ] Add photo upload (optional)
- [ ] Add status selector (for edit)
- [ ] Validate with Zod + react-hook-form
- [ ] Create `src/app/admin/employees/new/page.tsx`
- [ ] Create `src/app/admin/employees/[id]/edit/page.tsx`
- [ ] Create Server Actions: createEmployee, updateEmployee
- [ ] Auto-generate badge token on create
- [ ] Add audit logging

### Acceptance Criteria

```gherkin
Given I am on the new employee page
When I fill in valid data and submit
Then the employee is created
And they have a badge token
And an audit log entry exists
```

---

## Task: Skills Catalog Page

- type: task
- priority: 1
- labels: ui, skills
- estimate: 120

### Description

Create the skills catalog management page.

### Subtasks

- [ ] Create `src/app/admin/skills/page.tsx`
- [ ] Create data table listing all skills
- [ ] Show: name, code, max level, validity, active revision
- [ ] Add search and filter
- [ ] Add "Add Skill" dialog
- [ ] Create skill detail page with revisions
- [ ] Add revision management (draft, activate, archive)
- [ ] Show which employees need retraining when revision activated
- [ ] Create Server Actions: createSkill, updateSkill, createRevision

### Acceptance Criteria

```gherkin
Given I create a new skill "Forklift Operation"
When I add a revision and activate it
Then the skill shows as active
And I can see which employees are certified
```

---

## Task: Skill Requirements Page

- type: task
- priority: 1
- labels: ui, requirements
- estimate: 90

### Description

Create the interface for managing skill requirements (who needs what skills).

### Subtasks

- [ ] Create `src/app/admin/requirements/page.tsx`
- [ ] Create table showing all requirements
- [ ] Show: skill, scope (site/dept/role/project), required level
- [ ] Add "Add Requirement" dialog
- [ ] Add scope selectors (cascading: site → dept → role)
- [ ] Show impact preview (how many employees affected)
- [ ] Create Server Actions: createRequirement, updateRequirement

### Acceptance Criteria

```gherkin
Given I create a requirement "Safety" for site "Austin"
When I view the requirements list
Then I see the requirement with scope "Austin"
And I can see how many employees it affects
```

---

## Task: File Upload System

- type: task
- priority: 2
- labels: ui, files, s3
- estimate: 120

### Description

Implement presigned URL file upload flow for RustFS/S3.

### Subtasks

- [ ] Create `src/lib/s3.ts` with S3 client configuration
- [ ] Create `getUploadUrl(filename, mimeType)` Server Action
- [ ] Create `confirmUpload(s3Key)` Server Action
- [ ] Create `deleteFile(s3Key)` Server Action
- [ ] Create `FileUpload` component with drag-and-drop
- [ ] Show upload progress
- [ ] Validate file type and size before upload
- [ ] Create `attachments` record after upload
- [ ] Link attachments to skill revisions (SOPs)
- [ ] Link attachments to employee skills (evidence)

### Acceptance Criteria

```gherkin
Given I am on a skill revision page
When I drag a PDF file to the upload zone
Then the file uploads to RustFS
And an attachment record is created
And the file is linked to the revision
```

---

## EPIC: Phase 4 - Skill Matrix & Certification

- type: epic
- priority: 1
- labels: matrix, certification, phase-4

### Description

Build the skill matrix visualization and trainer certification workflows.

### Success Criteria

- [ ] Matrix view shows employee × skill grid with status colors
- [ ] Trainers can certify employees via badge scan
- [ ] Certifications can be revoked with reason
- [ ] Mobile experience works on tablets

---

## Task: Skill Matrix View

- type: task
- priority: 1
- labels: ui, matrix
- estimate: 180

### Description

Create the skill matrix grid view (employees × skills).

### Subtasks

- [ ] Create `src/app/admin/matrix/page.tsx`
- [ ] Create grid component: rows = employees, cols = skills
- [ ] Color cells by status: green (valid), yellow (expiring), red (missing/outdated)
- [ ] Add hover tooltip with details
- [ ] Add filters: site, department, skill category
- [ ] Use TanStack Virtual for performance (>100 rows)
- [ ] Add export to CSV functionality
- [ ] Make responsive (horizontal scroll on mobile)

### Acceptance Criteria

```gherkin
Given 50 employees and 10 skills exist
When I view the skill matrix
Then I see a grid with colored cells
And I can hover to see details
And performance is acceptable
```

---

## Task: Mobile Card View

- type: task
- priority: 2
- labels: ui, mobile
- estimate: 60

### Description

Create mobile-friendly card-based view as alternative to the matrix grid.

### Subtasks

- [ ] Create card component for employee skill summary
- [ ] Show employee name, photo, key stats
- [ ] Expandable to show all skills
- [ ] Swipeable actions (certify, view details)
- [ ] Filter by department/skill
- [ ] Optimize for tablet touch targets

### Acceptance Criteria

```gherkin
Given I view the matrix on a tablet
When I switch to card view
Then I see employee cards
And I can tap to expand skill details
```

---

## Task: Certification Revocation

- type: task
- priority: 1
- labels: certification, compliance
- estimate: 60

### Description

Implement the workflow for revoking a certification with reason.

### Subtasks

- [ ] Create `revokeEmployeeSkill(id, reason)` Server Action
- [ ] Update employeeSkills: set revokedAt, revokedByUserId, revocationReason
- [ ] Add audit log entry
- [ ] Create revocation dialog in UI
- [ ] Require reason text
- [ ] Show confirmation with impact
- [ ] Update gap analysis to treat revoked as MISSING
- [ ] Restrict to admin and skill_manager roles

### Acceptance Criteria

```gherkin
Given an employee has a valid certification
When I revoke it with reason "Failed practical assessment"
Then the certification shows as revoked
And the employee shows MISSING in gap analysis
And an audit log records the revocation
```

---

## EPIC: Phase 5 - Testing & CI/CD

- type: epic
- priority: 2
- labels: testing, quality, phase-5

### Description

Ensure reliability through comprehensive testing and CI/CD pipeline.

### Success Criteria

- [ ] Unit tests cover core business logic
- [ ] Integration tests cover auth and CRUD
- [ ] E2E tests cover critical user flows
- [ ] CI pipeline runs on every PR

---

## Task: Unit Test Setup

- type: task
- priority: 2
- labels: testing, vitest
- estimate: 60

### Description

Set up Vitest for unit testing.

### Subtasks

- [ ] Install `vitest` and `@testing-library/react`
- [ ] Configure `vitest.config.ts`
- [ ] Create test utilities and helpers
- [ ] Add `test` script to package.json
- [ ] Create example test for gap analysis service
- [ ] Create example test for permissions helper

### Acceptance Criteria

```gherkin
Given tests exist
When I run `bun run test`
Then Vitest runs all tests
And I see coverage report
```

---

## Task: E2E Test Setup

- type: task
- priority: 2
- labels: testing, playwright
- estimate: 90

### Description

Set up Playwright for end-to-end testing.

### Subtasks

- [ ] Install `@playwright/test`
- [ ] Configure `playwright.config.ts`
- [ ] Create test database setup
- [ ] Create auth helpers (login as different roles)
- [ ] Add `test:e2e` script to package.json
- [ ] Create tests for:
  - Login flow
  - Create employee
  - Certify employee
  - View skill matrix
  - Badge scan flow

### Acceptance Criteria

```gherkin
Given the app is running
When I run `bun run test:e2e`
Then Playwright tests execute
And critical flows are verified
```

---

## Task: CI/CD Pipeline

- type: task
- priority: 2
- labels: ci, github-actions
- estimate: 60

### Description

Set up GitHub Actions for continuous integration.

### Subtasks

- [ ] Create `.github/workflows/ci.yml`
- [ ] Run on push and PR to main
- [ ] Steps: install, lint (Biome), type check, unit tests, build
- [ ] Cache bun modules
- [ ] Add status badge to README
- [ ] Consider adding E2E tests (separate workflow)

### Acceptance Criteria

```gherkin
Given I push a branch
When CI runs
Then it lints, type checks, tests, and builds
And shows pass/fail status
```

---

## EPIC: Phase 6 - Offline & PWA

- type: epic
- priority: 2
- labels: offline, pwa, phase-6

### Description

Prepare the app for factory floor use with limited connectivity.

### Success Criteria

- [ ] App works offline for reads
- [ ] Certifications queue when offline and sync later
- [ ] App installable as PWA on tablets
- [ ] Conflicts handled with admin notification

---

## Task: TanStack Query Setup

- type: task
- priority: 2
- labels: offline, data-fetching
- estimate: 60

### Description

Configure TanStack Query for data fetching with offline support.

### Subtasks

- [ ] Install `@tanstack/react-query`
- [ ] Create QueryClient with offline config
- [ ] Add QueryClientProvider to app
- [ ] Configure staleTime for different data types
- [ ] Set up persist to IndexedDB
- [ ] Create custom hooks for common queries

### Acceptance Criteria

```gherkin
Given I load the employees list
When I go offline and refresh
Then I still see the cached employee data
```

---

## Task: Offline Mutation Queue

- type: task
- priority: 2
- labels: offline, sync
- estimate: 120

### Description

Implement offline mutation queue for certifications.

### Subtasks

- [ ] Install `dexie` for IndexedDB
- [ ] Create offline queue schema
- [ ] Create `useOnlineStatus` hook
- [ ] Queue mutations when offline
- [ ] Show visual indicator when offline
- [ ] Sync queue when back online
- [ ] Handle conflicts (last-write-wins with notification)
- [ ] Create admin conflict review page

### Acceptance Criteria

```gherkin
Given I am offline
When I certify an employee
Then the certification is queued locally
When I go back online
Then it syncs to the server
```

---

## Task: PWA Configuration

- type: task
- priority: 2
- labels: pwa, mobile
- estimate: 60

### Description

Configure the app as an installable Progressive Web App.

### Subtasks

- [ ] Install `next-pwa` or `@serwist/next`
- [ ] Create `manifest.json` with app metadata
- [ ] Add app icons (192, 512)
- [ ] Configure service worker for asset caching
- [ ] Add install prompt component
- [ ] Test installation on Android/iOS
- [ ] Add offline indicator in header

### Acceptance Criteria

```gherkin
Given I visit the app on a tablet
When I click "Add to Home Screen"
Then the app installs as a PWA
And works offline for basic features
```

---

## EPIC: Phase 7 - Production Deployment

- type: epic
- priority: 1
- labels: deployment, production, phase-7

### Description

Prepare and execute production deployment.

### Success Criteria

- [ ] Production Docker build works
- [ ] Database migrations applied
- [ ] SSL configured
- [ ] Backups scheduled
- [ ] Monitoring in place

---

## Task: Production Docker Build

- type: task
- priority: 1
- labels: deployment, docker
- estimate: 60

### Description

Create optimized production Docker configuration.

### Subtasks

- [ ] Create `Dockerfile.prod` (multi-stage build)
- [ ] Configure `next.config.js` with `output: 'standalone'`
- [ ] Create non-root user for security
- [ ] Test build locally
- [ ] Optimize image size
- [ ] Document build process

### Acceptance Criteria

```gherkin
Given the Dockerfile.prod exists
When I run `docker build -f Dockerfile.prod .`
Then a working image is built
And it runs the app correctly
```

---

## Task: Database Migration Process

- type: task
- priority: 1
- labels: deployment, database
- estimate: 45

### Description

Establish database migration process for production.

### Subtasks

- [ ] Run all migrations on staging
- [ ] Apply triggers
- [ ] Seed initial production data (sites, roles, admin user)
- [ ] Document rollback procedure
- [ ] Create backup before migration script

### Acceptance Criteria

```gherkin
Given a fresh production database
When I run the migration process
Then all tables, triggers, and initial data exist
```

---

## Task: Backup & Monitoring

- type: task
- priority: 1
- labels: deployment, ops
- estimate: 90

### Description

Set up backup strategy and monitoring.

### Subtasks

- [ ] Create daily database backup script
- [ ] Configure RustFS backup/replication
- [ ] Set up log aggregation
- [ ] Configure container health checks
- [ ] Set up uptime monitoring
- [ ] Create alerting for failures
- [ ] Document recovery procedures

### Acceptance Criteria

```gherkin
Given the production system is running
When a daily backup runs
Then the database is backed up
And I can restore from it
```

---

## Task: Go-Live Checklist

- type: task
- priority: 1
- labels: deployment
- estimate: 30

### Description

Complete the final go-live checklist.

### Subtasks

- [ ] SSL certificate configured
- [ ] Rate limiting enabled
- [ ] Admin password changed from default
- [ ] Environment variables secured
- [ ] Print test badge and scan
- [ ] Train key users on system
- [ ] Document support contact
- [ ] Schedule go-live time

### Acceptance Criteria

```gherkin
Given all checklist items are complete
When we go live
Then users can access the system
And basic flows work correctly
```

---

## EPIC: Internationalization

- type: epic
- priority: 2
- labels: i18n, phase-future

### Description

Add multi-language support using next-intl.

### Subtasks

- [ ] Install and configure next-intl
- [ ] Create English translation file (complete)
- [ ] Create Spanish translation file
- [ ] Add language switcher
- [ ] Update all components to use translations
- [ ] Add user locale preference

---

## EPIC: Future Enhancements

- type: epic
- priority: 3
- labels: future, post-mvp

### Description

Post-MVP features for future consideration.

### Subtasks

- [ ] Bulk employee import (CSV)
- [ ] Email notifications for expiring certifications
- [ ] Mobile app (React Native)
- [ ] LMS integration
- [ ] Analytics dashboard
- [ ] Scheduled compliance reports
- [ ] SSO integration (SAML/OIDC)

---
