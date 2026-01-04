Here is the **complete, copy-paste ready Drizzle schema** and the **detailed implementation roadmap** for "Caliber," designed for your specific stack (Next.js 16, Bun, Drizzle, On-Site/Multi-Site).

---

### Part 1: The Complete Drizzle Schema (`src/db/schema.ts`)

This schema enforces **Site Scoping**, **Version Control**, and **UUIDv7** throughout.

```typescript
import { pgTable, text, timestamp, integer, boolean, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// --- 1. UTILITIES ---
// We use 'text' for IDs to support application-side UUIDv7 generation easily.
const commonCols = {
  id: text('id').primaryKey(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Handle updates via triggers or app logic
  deletedAt: timestamp('deleted_at'), // Soft delete for compliance/audit
};

// --- 2. ORGANIZATION (Physical & Logical) ---

export const sites = pgTable('sites', {
  ...commonCols,
  name: text('name').notNull(),    // e.g., "Austin Plant"
  code: text('code').notNull().unique(), // e.g., "ATX-01"
  timezone: text('timezone').default('UTC'),
});

// Departments are usually global (HR is HR everywhere), but you can scope if needed.
export const departments = pgTable('departments', {
  ...commonCols,
  name: text('name').notNull(), 
});

// Roles are global definitions (Technician Level 1).
export const roles = pgTable('roles', {
  ...commonCols,
  name: text('name').notNull(),
});

// Projects are physically located at a Site.
export const projects = pgTable('projects', {
  ...commonCols,
  siteId: text('site_id').references(() => sites.id).notNull(),
  departmentId: text('department_id').references(() => departments.id),
  name: text('name').notNull(), // "Line 4", "Project Zeus"
  isActive: boolean('is_active').default(true),
});

// --- AUTH (Separate from Business Entities) ---
// Not all employees have logins. External auditors may have logins but no employee record.
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),  // Null if SSO-only
  appRole: text('app_role', { enum: ['admin', 'trainer', 'auditor', 'viewer'] }).default('viewer'),
  status: text('status', { enum: ['active', 'disabled'] }).default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const employees = pgTable('employees', {
  ...commonCols,
  userId: text('user_id').references(() => users.id), // Nullable - only if employee has app access
  siteId: text('site_id').references(() => sites.id).notNull(),
  departmentId: text('department_id').references(() => departments.id),
  roleId: text('role_id').references(() => roles.id), // Job title, NOT app permissions
  employeeNumber: text('employee_number').notNull().unique(), // HR identifier (e.g., "EMP-0042")
  badgeToken: text('badge_token').notNull().unique(), // Random token for QR code URL (can be regenerated if badge lost)
  name: text('name').notNull(),
  email: text('email'), // HR/contact email, not for login (nullable)
  status: text('status', { enum: ['active', 'terminated', 'leave'] }).default('active'),
});

// --- 3. SKILL CATALOG (Version Controlled) ---

export const skills = pgTable('skills', {
  ...commonCols,
  name: text('name').notNull(),
  description: text('description'),
  validityMonths: integer('validity_months'), // Null = Never expires
  code: text('code'), // e.g., "SOP-104"
});

export const skillRevisions = pgTable('skill_revisions', {
  ...commonCols,
  skillId: text('skill_id').references(() => skills.id).notNull(),
  revisionLabel: text('revision_label').notNull(), // "Rev B"
  changeLog: text('change_log'),
  status: text('status', { enum: ['draft', 'active', 'archived'] }).default('draft'),
  effectiveDate: timestamp('effective_date'),
  requiresRetraining: boolean('requires_retraining').default(true),
});

// --- 4. THE RULES ENGINE (Requirement Matrix) ---

export const skillRequirements = pgTable('skill_requirements', {
  ...commonCols,
  skillId: text('skill_id').references(() => skills.id).notNull(),
  
  // THE SCOPE SELECTORS (Nullable FKs)
  // If all are NULL, it's a global requirement for everyone.
  siteId: text('site_id').references(() => sites.id), 
  departmentId: text('department_id').references(() => departments.id),
  roleId: text('role_id').references(() => roles.id),
  projectId: text('project_id').references(() => projects.id),
  
  requiredLevel: integer('required_level').default(1),
}, (t) => ({
  // Optimization: Index for the "Gap Analysis" query
  scopeIdx: uniqueIndex('req_scope_idx').on(t.skillId, t.siteId, t.departmentId, t.roleId, t.projectId),
}));

// --- 5. EXECUTION & EVIDENCE (The Transcript) ---

export const employeeSkills = pgTable('employee_skills', {
  ...commonCols,
  employeeId: text('employee_id').references(() => employees.id).notNull(),
  skillId: text('skill_id').references(() => skills.id).notNull(),
  skillRevisionId: text('skill_revision_id').references(() => skillRevisions.id).notNull(),
  
  achievedAt: timestamp('achieved_at').notNull(),
  expiresAt: timestamp('expires_at'), // Calculated upon insertion
  certifiedByUserId: text('certified_by_user_id'), // Who signed this off?
});

// --- 6. FILE ATTACHMENTS (S3/MinIO) ---

export const attachments = pgTable('attachments', {
  ...commonCols,
  s3Key: text('s3_key').notNull(),
  bucket: text('bucket').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
});

// Link SOPs to Revisions ("Read this PDF")
export const skillRevisionDocuments = pgTable('skill_revision_documents', {
  id: text('id').primaryKey(),
  skillRevisionId: text('skill_revision_id').references(() => skillRevisions.id).notNull(),
  attachmentId: text('attachment_id').references(() => attachments.id).notNull(),
  type: text('type', { enum: ['sop', 'visual_aid', 'quiz'] }).default('sop'),
});

// Link Evidence to Employee Records ("Here is my certificate")
export const employeeSkillEvidence = pgTable('employee_skill_evidence', {
  id: text('id').primaryKey(),
  employeeSkillId: text('employee_skill_id').references(() => employeeSkills.id).notNull(),
  attachmentId: text('attachment_id').references(() => attachments.id).notNull(),
});

// --- 7. RELATIONS ---

export const usersRelations = relations(users, ({ one }) => ({
  employee: one(employees, { fields: [users.id], references: [employees.userId] }), // Reverse lookup
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }), // Optional login
  site: one(sites, { fields: [employees.siteId], references: [sites.id] }),
  department: one(departments, { fields: [employees.departmentId], references: [departments.id] }),
  role: one(roles, { fields: [employees.roleId], references: [roles.id] }),
  skills: many(employeeSkills),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  revisions: many(skillRevisions),
  requirements: many(skillRequirements),
}));

export const skillRevisionsRelations = relations(skillRevisions, ({ one, many }) => ({
  skill: one(skills, { fields: [skillRevisions.skillId], references: [skills.id] }),
  documents: many(skillRevisionDocuments),
}));

```

---

### Part 2: Detailed Implementation Plan

This roadmap assumes a 2-developer team working for ~4-6 weeks to MVP.

#### **Phase 1: Foundation & DevOps (Week 1)**

*Goal: Get the local environment running with DB and Docker.*

1. **Repo Setup:**
* Init Next.js 16 (App Router) + Bun.
* Install Shadcn UI, Tailwind, Lucide React.
* Set up biome for linting.


2. **Database Containerization:**
* Create `docker-compose.yml` with Postgres 16 and MinIO (for local S3 dev).
* Configure Drizzle (`drizzle.config.ts`) to connect to localhost Postgres.


3. **Schema & Migrations:**
* Paste the schema above.
* Run `bun drizzle-kit generate` and `bun drizzle-kit push`.


4. **Seeding Script (`src/scripts/seed.ts`):**
* Crucial: Create a script to generate 1 Site ("Headquarters"), 3 Depts (Molding, Assembly, HR), and 5 Roles.
* This ensures every dev has the same baseline data.



#### **Phase 1.5: Authentication & Authorization (Week 1-2)**

*Goal: Secure the app with login and role-based access.*

1. **NextAuth.js Setup:**
   * Install `next-auth` and configure with Credentials Provider (email/password).
   * Create auth routes at `app/api/auth/[...nextauth]/route.ts`.
   * Store sessions in database (Drizzle adapter) or JWT.

2. **Login UI:**
   * Create `/login` page with email/password form.
   * Redirect to dashboard on success.

3. **Protected Routes Middleware:**
   * Create `middleware.ts` to protect `/admin/*` routes.
   * Check session exists and `user.status === 'active'`.

4. **Role-Based Access Control (RBAC):**
   * Define permission matrix:
     | Route/Action | Admin | Trainer | Auditor | Viewer |
     |--------------|-------|---------|---------|--------|
     | Manage Users | ✓ | | | |
     | Manage Skills Catalog | ✓ | | | |
     | Certify Employees | ✓ | ✓ | | |
     | View All Reports | ✓ | ✓ | ✓ | |
     | View Own Skills | ✓ | ✓ | ✓ | ✓ |
   * Create `src/lib/auth/permissions.ts` with `canAccess(user, action)` helper.

5. **User Management Page:**
   * Admin-only page at `/admin/users`.
   * Create users, assign `appRole`, link to existing employee (optional).


#### **Phase 2: The Core Logic "The Brain" (Week 2)**

*Goal: Implement the difficult business logic before building UI.*

1. **UUIDv7 Utility:**
* Create `src/lib/id.ts` wrapping `uuidv7` package.


2. **The "Gap Analysis" Service:**
* Write the raw SQL query (as discussed previously) in `src/server/services/gap-analysis.ts`.
* **Unit Test this thoroughly:** Create a test user, assign requirements, run the query, assert they come back "MISSING".
* Assign a skill (old revision), run query, assert "OUTDATED".
* Assign current skill, assert "VALID".


3. **Requirement Matcher:**
* Create a function `getRequirementsForEmployee(employeeId)` that resolves the Dept/Role/Project hierarchy.



#### **Phase 3: Administrative UI (Week 3)**

*Goal: Allow HR/Admins to manage the catalog.*

1. **Employees Page:**
* Data Table with filters (Site, Dept).
* "Add Employee" Dialog (Server Action -> DB Insert).


2. **Skills Catalog:**
* List of Skills.
* **Revision Manager:** A complex drawer/modal to "Draft New Revision".
* **File Upload:** Implement the `Presigned URL` flow.
* Server Action: `getUploadUrl(filename, type)` -> Returns MinIO/S3 URL.
* Client: `fetch(url, { method: 'PUT', body: file })`.
* Server Action: `confirmUpload(key)` -> Insert into `attachments`.



#### **Phase 3.5: QR Badge Skill Viewer (Week 3-4)**

*Goal: Allow supervisors/auditors to scan a badge and instantly see employee qualifications—no login required.*

1. **Badge Token Generation:**
   * When creating an employee, generate a secure random `badgeToken` (e.g., `nanoid(21)`).
   * This token is embedded in the QR code URL, NOT the employee number.
   * If badge is lost, regenerate token → old QR becomes invalid.

2. **Public Skills Page (`/b/[badgeToken]`):**
   * **No auth required** — accessible by anyone with the QR code.
   * Route: `app/(public)/b/[badgeToken]/page.tsx`
   * Fetches employee by `badgeToken`, returns 404 if not found or terminated.

3. **Page Content:**
   * **Header:** Employee name, photo (optional), department, role, site.
   * **Skills List:** All skills the employee has been certified on.
     | Skill Name | Level | Certified Date | Expires | Status |
     |------------|-------|----------------|---------|--------|
     | Injection Molding 101 | 2 | Jan 2026 | Jan 2027 | ✅ Valid |
     | Forklift Operation | 1 | Dec 2025 | Dec 2026 | ⚠️ Expiring Soon |
     | Safety Protocols Rev C | 1 | Nov 2025 | — | ✅ Valid |
   * Color-coded status badges (green/yellow/red).
   * **No edit actions** — this is a read-only public view.

4. **QR Code Generation:**
   * Admin page: Add "Download Badge QR" button on employee detail page.
   * Generate QR code containing URL: `https://skills.yourcompany.com/b/{badgeToken}`
   * Use `qrcode` npm package for generation.
   * Option to print as a badge-sized label.

5. **Security Considerations:**
   * `badgeToken` is random, not guessable from `employeeNumber`.
   * Rate-limit the `/b/[badgeToken]` route to prevent enumeration attacks.
   * Consider adding optional PIN for sensitive environments (future enhancement).



#### **Phase 4: Matrix & Training Execution (Week 4)**

*Goal: The user-facing operational screens.*

1. **The Matrix View:**
* A massive grid component. Rows = Employees, Cols = Skills.
* Cells = Colored Badges (Green/Red/Yellow).
* *Performance Note:* Use TanStack Virtual if you have >100 rows.


2. **"Quick Certify" Mode:**
* A view for Trainers.
* Select "Injection Molding 101".
* Scan Employee Badge (or select from list).
* Click "Certify" -> Creates `employee_skills` record with UUIDv7.



#### **Phase 5: Offline Sync & Site Prep (Week 5)**

*Goal: Prepare for the factory floor.*

1. **Offline State Management:**
* Install **TanStack Query (React Query)**. It has built-in offline caching.
* Configure `staleTime: Infinity` for the Skills Catalog (it rarely changes).


2. **The "Pending Sync" Queue:**
* If offline, store "New Certifications" in `localStorage` or `IndexedDB`.
* Create a global `useOnlineStatus` hook.
* When back online, iterate the queue and POST to Server Actions.


3. **Docker Production Build:**
* Optimize `Dockerfile` (multi-stage) for production.
* Test deployment on a local Linux server.



---

### Part 3: Deployment Configuration (Docker)

**`Dockerfile.prod`** (Optimized for Bun + Next.js)

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

**`docker-compose.prod.yml`**

```yaml
version: '3.8'
services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: caliber
    volumes:
      - pg_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    restart: always
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: secure_password
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  app:
    build: 
      context: .
      dockerfile: Dockerfile.prod
    restart: always
    ports:
      - "80:3000"
    environment:
      DATABASE_URL: postgres://admin:secure_password@db:5432/caliber
      # Point S3 to local MinIO
      S3_ENDPOINT: http://minio:9000 
      S3_REGION: us-east-1
      S3_ACCESS_KEY: admin
      S3_SECRET_KEY: secure_password
      S3_BUCKET: caliber-uploads
      NEXTAUTH_URL: http://skills.local
      NEXTAUTH_SECRET: openssl_random_string_here
    depends_on:
      - db
      - minio

volumes:
  pg_data:
  minio_data:

```