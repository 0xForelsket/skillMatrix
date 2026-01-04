# Implementation Roadmap

This roadmap assumes a 2-developer team working for ~6-7 weeks to MVP.

---

## Phase 1: Foundation & DevOps (Week 1)

*Goal: Get the local environment running with DB and Docker.*

### 1.1 Repo Setup
- [ ] Init Next.js 16 (App Router) + Bun
- [ ] Install Shadcn UI, Tailwind, Lucide React
- [ ] Set up Biome for linting
- [ ] Configure `tsconfig.json` with `strict: true`

### 1.2 Database Containerization
- [ ] Create `docker-compose.yml` with Postgres 16 and RustFS (for local S3 dev)
- [ ] Configure Drizzle (`drizzle.config.ts`) to connect to localhost Postgres
- [ ] Create RustFS bucket `caliber-uploads`

### 1.3 Schema & Migrations
- [ ] Copy schema from `docs/schema.md` to `src/db/schema.ts`
- [ ] Run `bun drizzle-kit generate` and `bun drizzle-kit push`
- [ ] Apply `updated_at` trigger (see schema.md for DDL)

### 1.4 Seeding Script (`src/db/seed.ts`)

Create a comprehensive seed script that populates test data for all features:

```bash
bun run db:seed  # Defined in package.json as: bun run src/db/seed.ts
```

**Required Seed Data:**

- [ ] **Organization Structure:**
  - 2 Sites: "Austin Plant" (ATX-01), "Detroit Plant" (DTR-01)
  - 4 Departments: Production, Quality, Maintenance, HR
  - 5 Roles: Operator L1, Operator L2, Technician, Lead, Supervisor

- [ ] **Users & Employees:**
  - 1 Admin user (admin@caliber.local / admin123)
  - 1 Skill Manager (hr@caliber.local)
  - 2 Trainers (trainer1@caliber.local, trainer2@caliber.local)
  - 1 Auditor (auditor@caliber.local)
  - 10 Sample employees (mix of sites/departments)
    - 5 with user accounts (can log in)
    - 5 without user accounts (badge-only)

- [ ] **Skills Catalog:**
  - 5 Skills with varying configurations:
    - "Safety Protocols" (no expiry, 1 level, 2 revisions: Rev A archived, Rev B active)
    - "Forklift Operation" (12-month expiry, 1 level)
    - "Injection Molding" (24-month expiry, 3 levels)
    - "Quality Inspection" (6-month expiry, 2 levels)
    - "First Aid" (12-month expiry, 1 level, external certification)

- [ ] **Skill Requirements:**
  - Global: Everyone needs "Safety Protocols"
  - Site-specific: Austin needs "Injection Molding" (it's a molding plant)
  - Department-specific: Production needs "Quality Inspection"
  - Role-specific: Operators L2+ need "Forklift Operation"

- [ ] **Employee Skills (Test Scenarios):**
  - Employee A: All skills valid (VALID)
  - Employee B: Missing "Forklift" requirement (MISSING)
  - Employee C: Certified on archived revision (OUTDATED)
  - Employee D: Skill expires in 15 days (EXPIRING_SOON)
  - Employee E: Has Level 1, needs Level 2 (INSUFFICIENT_LEVEL)
  - Employee F: Had skill revoked (tests revocation flow)

- [ ] **Test Data Validation:**
  - Run gap analysis on each employee
  - Assert expected status for each scenario
  - Log summary: "Seed complete: X employees, Y skills, Z certifications"

> 💡 **This seed data enables testing the gap analysis feature immediately after setup.**

### 1.5 Audit Logging Setup
- [ ] Create `src/lib/audit.ts` with `logAudit(action, entityType, entityId, oldValue, newValue)` helper
- [ ] Integrate with Server Actions

---

## Phase 1.5: Authentication & Authorization (Week 1-2)

*Goal: Secure the app with login and role-based access.*

### 1.5.1 NextAuth.js Setup
- [ ] Install `next-auth` and configure with Credentials Provider (email/password)
- [ ] Create auth routes at `app/api/auth/[...nextauth]/route.ts`
- [ ] Store sessions in database (Drizzle adapter) or JWT
- [ ] Hash passwords with `argon2` or `bcrypt`

### 1.5.2 Login UI
- [ ] Create `/login` page with email/password form
- [ ] Redirect to dashboard on success
- [ ] Add error handling (invalid credentials, disabled account)
- [ ] Add toast notifications for auth errors

### 1.5.3 Protected Routes Middleware
- [ ] Create `middleware.ts` to protect `/admin/*` routes
- [ ] Check session exists and `user.status === 'active'`
- [ ] Redirect to `/login` if not authenticated

### 1.5.4 Role-Based Access Control (RBAC)

**Roles:**
- **Admin** — Full system access, user management
- **Skill Manager** — Manages skills catalog & requirements (HR/Training Coordinator, Quality Manager, Production Manager)
- **Trainer** — Certifies employees on skills
- **Auditor** — Read-only access to all data and audit logs
- **Viewer** — Read own skills only

| Route/Action | Admin | Skill Mgr | Trainer | Auditor | Viewer |
|--------------|:-----:|:---------:|:-------:|:-------:|:------:|
| Manage Users | ✓ | | | | |
| Manage Skills Catalog | ✓ | ✓ | | | |
| Manage Skill Requirements | ✓ | ✓ | | | |
| Manage Skill Revisions | ✓ | ✓ | | | |
| Certify Employees | ✓ | ✓ | ✓ | | |
| Revoke Certifications | ✓ | ✓ | | | |
| Manage Employees (CRUD) | ✓ | ✓ | | | |
| View All Reports | ✓ | ✓ | ✓ | ✓ | |
| View Own Skills | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Audit Logs | ✓ | | | ✓ | |

- [ ] Create `src/lib/auth/permissions.ts` with `canAccess(user, action)` helper
- [ ] Create React component `<RequireRole roles={['admin', 'skill_manager']}>` for UI gating

### 1.5.5 User Management Page
- [ ] Admin-only page at `/admin/users`
- [ ] Create users, assign `appRole`, link to existing employee (optional)
- [ ] Disable/enable user accounts

---

## Phase 2: The Core Logic "The Brain" (Week 2)

*Goal: Implement the difficult business logic before building UI.*

### 2.1 UUIDv7 Utility
- [ ] Create `src/lib/id.ts` wrapping `uuidv7` package
- [ ] Create `src/lib/token.ts` for `nanoid(21)` badge tokens

### 2.2 Soft Delete Helper
- [ ] Create `src/db/helpers.ts` with `withActive(table)` filter
- [ ] Apply consistently across all queries

### 2.3 The "Gap Analysis" Service
- [ ] Implement SQL query from `docs/schema.md` in `src/server/services/gap-analysis.ts`
- [ ] **Unit test thoroughly:**
  - Create test employee, assign requirements → assert "MISSING"
  - Assign skill (old revision) → assert "OUTDATED"
  - Assign skill (current revision) → assert "VALID"
  - Assign skill (expires in 30 days) → assert "EXPIRING_SOON"
  - Assign skill (insufficient level) → assert "INSUFFICIENT_LEVEL"
  - Revoke skill → assert "MISSING"

### 2.4 Requirement Matcher
- [ ] Create function `getRequirementsForEmployee(employeeId)` that resolves the Dept/Role/Project hierarchy
- [ ] Handle scope precedence (more specific overrides less specific)

### 2.5 Expiration Calculator
- [ ] Create `calculateExpiresAt(skill, achievedAt)` function
- [ ] Handle `validityMonths: null` (never expires)

---

## Phase 3: Administrative UI (Week 3)

*Goal: Allow HR/Admins to manage the catalog.*

### 3.1 Error Handling & UX Patterns

**Global Error Boundary:**
- [ ] Create `app/error.tsx` for route-level errors
- [ ] Create `app/global-error.tsx` for root layout errors
- [ ] Show user-friendly message + "Report Issue" button
- [ ] Log errors to console in dev, reporting service in prod

**Toast Notification System:**
- [ ] Install `sonner` for toast notifications
- [ ] Create `src/lib/toast.ts` with typed helpers:
  ```typescript
  export const showSuccess = (message: string) => toast.success(message);
  export const showError = (message: string) => toast.error(message);
  export const showLoading = (message: string) => toast.loading(message);
  ```

**Server Action Error Handling:**
```typescript
// Pattern for all Server Actions
export async function createEmployee(data: CreateEmployeeInput) {
  try {
    const validated = createEmployeeSchema.parse(data);
    const result = await db.insert(employees).values(validated).returning();
    await logAudit('create', 'employee', result[0].id, null, result[0]);
    return { success: true, data: result[0] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: 'Validation failed', details: error.flatten() };
    }
    console.error('createEmployee failed:', error);
    return { success: false, error: 'Failed to create employee' };
  }
}
```

**Error Reporting (Production):**
- [ ] Integrate Sentry or similar error tracking
- [ ] Configure source maps for stack traces
- [ ] Set up error alerting for critical failures

**Form Validation:**
- [ ] Create form validation patterns with Zod + react-hook-form
- [ ] Show inline validation errors
- [ ] Disable submit button while loading

### 3.2 Employees Page
- [ ] Data Table with filters (Site, Dept, Status)
- [ ] "Add Employee" Dialog (Server Action → DB Insert)
  - Auto-generate `badgeToken` on creation
- [ ] Employee detail page with skill summary
- [ ] "Download Badge QR" button
- [ ] Photo upload (optional)
- [ ] Regenerate badge token action

### 3.3 Skills Catalog
- [ ] List of Skills with search/filter
- [ ] **Revision Manager:** Drawer/modal to "Draft New Revision"
- [ ] Activate/Archive revision workflow
- [ ] Show which employees need retraining when new revision activated

### 3.4 File Upload (Presigned URL Flow)
- [ ] Server Action: `getUploadUrl(filename, type)` → Returns RustFS presigned URL
- [ ] Client: `fetch(url, { method: 'PUT', body: file })`
- [ ] Server Action: `confirmUpload(key)` → Insert into `attachments`
- [ ] Implement cleanup job for orphan uploads (optional)
- [ ] Validate file type and size before upload

---

## Phase 3.5: QR Badge Skill Viewer (Week 3-4)

*Goal: Allow supervisors/auditors to scan a badge and instantly see employee qualifications—no login required.*

### 3.5.1 Badge Token Generation
- [ ] When creating employee, generate secure random `badgeToken` (e.g., `nanoid(21)`)
- [ ] Token embedded in QR code URL, NOT the employee number
- [ ] If badge lost → regenerate token → old QR becomes invalid

### 3.5.2 Public Skills Page (`/b/[badgeToken]`)
- [ ] **No auth required** — accessible by anyone with the QR code
- [ ] Route: `app/(public)/b/[badgeToken]/page.tsx`
- [ ] Fetches employee by `badgeToken`, returns 404 if not found or terminated
- [ ] Mobile-responsive design (primary use case)

### 3.5.3 Page Content

**Header:**
- Employee name, photo (if available), department, role, site

**Skills List:**

| Skill Name | Level | Certified Date | Expires | Status |
|------------|-------|----------------|---------|--------|
| Injection Molding 101 | 2/3 | Jan 2026 | Jan 2027 | ✅ Valid |
| Forklift Operation | 1/1 | Dec 2025 | Dec 2026 | ⚠️ Expiring Soon |
| Safety Protocols Rev C | 1/2 | Nov 2025 | — | ✅ Valid |

- [ ] Color-coded status badges (green/yellow/red)
- [ ] Show level as "achieved/max" (e.g., "2/3")
- [ ] **No edit actions** — read-only public view

### 3.5.4 QR Code Generation
- [ ] Add "Download Badge QR" button on employee detail page
- [ ] Generate QR code containing URL: `https://skills.yourcompany.com/b/{badgeToken}`
- [ ] Use `qrcode` npm package for generation
- [ ] Option to print as a badge-sized label (PDF generation)

### 3.5.5 Security Considerations
- [ ] `badgeToken` is random, not guessable from `employeeNumber`
- [ ] Rate-limit the `/b/[badgeToken]` route (see `docs/deployment.md` for nginx/Caddy config)
- [ ] Consider adding optional PIN for sensitive environments (future enhancement)

---

## Phase 4: Matrix & Training Execution (Week 4-5)

*Goal: The user-facing operational screens.*

### 4.1 The Matrix View (Desktop)
- [ ] Grid component: Rows = Employees, Cols = Skills
- [ ] Cells = Colored Badges (Green/Red/Yellow)
- [ ] *Performance:* Use TanStack Virtual for >100 rows
- [ ] Filters: Site, Dept, Skill Category, Status
- [ ] Export to CSV/Excel

### 4.2 Mobile Alternative View
- [ ] Card-based list view for trainers on tablets/phones
- [ ] Filter to specific department/skill
- [ ] Quick access to certification actions

### 4.3 "Quick Certify" Mode
- [ ] View for Trainers (mobile-optimized)
- [ ] Select skill (e.g., "Injection Molding 101")
- [ ] Scan Employee Badge (or select from list)
- [ ] Select level achieved
- [ ] Add optional notes
- [ ] Click "Certify" → Creates `employee_skills` record with UUIDv7
- [ ] Audit log entry created automatically

### 4.4 Revocation Workflow
- [ ] Admin-only action on employee skill detail
- [ ] Require reason (free text)
- [ ] Creates audit log entry
- [ ] Employee shows as "MISSING" in gap analysis

---

## Phase 5: Testing & Quality (Week 5)

*Goal: Ensure reliability before deployment.*

### 5.1 Unit Tests
- [ ] Gap analysis service (all edge cases)
- [ ] Permission helpers
- [ ] Audit logging

### 5.2 Integration Tests
- [ ] Auth flow (login, logout, session)
- [ ] CRUD operations with audit trails
- [ ] File upload flow

### 5.3 E2E Tests (Playwright)
- [ ] Login flow
- [ ] Create employee and certify skill
- [ ] Quick certify flow
- [ ] QR badge scan flow
- [ ] Matrix view with filters

### 5.4 CI/CD Pipeline
- [ ] GitHub Actions workflow:
  - Lint (Biome)
  - Type check
  - Unit tests
  - Build
- [ ] Deploy preview for PRs (optional)

---

## Phase 6: Offline Sync & Site Prep (Week 6)

*Goal: Prepare for the factory floor.*

### 6.1 Offline State Management
- [ ] Install **TanStack Query (React Query)** with built-in offline caching
- [ ] Configure `staleTime: Infinity` for Skills Catalog (rarely changes)
- [ ] Persist query cache to IndexedDB using `@tanstack/query-sync-storage-persister`
- [ ] Configure cache expiration (24 hours for most data)

### 6.2 The "Pending Sync" Queue
- [ ] If offline, store "New Certifications" in IndexedDB (use Dexie.js)
- [ ] Create global `useOnlineStatus` hook
- [ ] Visual indicator when offline (banner + icon)
- [ ] When back online, iterate queue and POST to Server Actions

**Conflict Resolution Strategy:**

When syncing offline changes, conflicts can occur. Here's the handling:

| Scenario | Resolution | User Notification |
|----------|------------|-------------------|
| Same employee certified by two trainers offline | **Last-write-wins** by `achievedAt` timestamp | Toast: "Certification updated by [other trainer]" |
| Employee terminated while offline certification pending | **Reject sync**, keep in queue | Error: "Employee no longer active - contact admin" |
| Skill revision changed while offline | **Accept with warning** | Toast: "Certified on outdated revision - recertification recommended" |
| Duplicate certification (same skill, same day) | **Merge**, keep higher level | Silent merge, log to audit |

**Conflict Queue UI (`/admin/sync-conflicts`):**
- [ ] List all unresolved conflicts
- [ ] Show: Employee, Skill, Conflicting Values, Timestamps
- [ ] Actions: Accept Local, Accept Remote, Merge (for levels)
- [ ] Admin-only access
- [ ] Email notification when conflicts need review

**Audit Trail for Conflicts:**
```typescript
await logAudit('conflict_resolved', 'employee_skill', id, {
  localValue: { achievedAt: '...', certifiedBy: 'trainer1' },
  remoteValue: { achievedAt: '...', certifiedBy: 'trainer2' },
  resolution: 'last_write_wins',
  resolvedBy: 'system' // or userId if manual
});
```

### 6.3 Service Worker (PWA)
- [ ] Install as PWA on tablets using `next-pwa` or `@serwist/next`
- [ ] Cache static assets (JS, CSS, fonts, icons)
- [ ] Cache API responses for offline reads
- [ ] Show offline indicator in app header
- [ ] Queue mutations when offline

---

## Phase 7: Production Deployment (Week 6-7)

*Goal: Go live.*

### 7.1 Docker Production Build
- [ ] Optimize `Dockerfile` (multi-stage) for production
- [ ] Test deployment on staging server
- [ ] See `docs/deployment.md` for configuration

### 7.2 Database Preparation
- [ ] Run all migrations
- [ ] Apply triggers
- [ ] Seed production data (sites, depts, roles)
- [ ] Create initial admin user

### 7.3 Backup & Monitoring
- [ ] Set up daily database backups (cron)
- [ ] Set up RustFS backup/replication
- [ ] Configure health checks
- [ ] Set up log aggregation

### 7.4 Go-Live Checklist
- [ ] SSL certificate configured
- [ ] Rate limiting enabled
- [ ] Admin password changed
- [ ] Print test badge and scan
- [ ] Train key users

---

## Timeline Summary

| Week | Phase | Deliverables |
|------|-------|--------------|
| 1 | Foundation | Dev environment, DB, schema, audit logging |
| 1-2 | Auth | Login, RBAC, user management |
| 2 | Core Logic | Gap analysis, requirement matching, soft deletes |
| 3 | Admin UI | Employee/Skill CRUD, file uploads, error handling |
| 3-4 | QR Badge | Public skill viewer, QR generation |
| 4-5 | Matrix | Skill matrix grid, quick certify, revocation |
| 5 | Testing | Unit, integration, E2E tests, CI/CD |
| 6 | Offline | PWA, offline queue, sync conflict handling |
| 6-7 | Deploy | Docker, backups, monitoring, go-live |

---

## Future Enhancements (Post-MVP)

- [ ] **Bulk Import:** CSV upload for employees and skills
- [ ] **Notifications:** Email alerts for expiring certifications (30/14/7 days)
- [ ] **Mobile App:** React Native wrapper for trainers
- [ ] **LMS Integration:** Sync with external learning management systems
- [ ] **Analytics Dashboard:** Compliance trends, training metrics
- [ ] **Scheduled Reports:** Auto-generate weekly compliance reports
- [ ] **Multi-tenant Support:** If expanding to SaaS model
- [ ] **SSO Integration:** SAML/OIDC for enterprise customers
