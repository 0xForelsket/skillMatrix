# Database Schema

This schema is designed for Drizzle ORM with PostgreSQL. It enforces **Site Scoping**, **Version Control**, and **UUIDv7** throughout.

## Design Principles

1. **UUIDv7 for IDs:** Sortable, globally unique, application-generated
2. **Soft Deletes:** `deletedAt` column for compliance/audit trails
3. **Users ≠ Employees:** Authentication is separate from business entities
4. **Version-Controlled Skills:** Skills have revisions; employees are certified on specific revisions
5. **Audit Everything:** All changes logged for compliance

---

## Complete Schema (`src/db/schema.ts`)

```typescript
import { pgTable, text, timestamp, integer, boolean, uniqueIndex, index, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- 1. UTILITIES ---
// We use 'text' for IDs to support application-side UUIDv7 generation easily.
const commonCols = {
  id: text('id').primaryKey(), 
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(), // Updated via Postgres trigger
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
  photoUrl: text('photo_url'), // Optional employee photo for badge/QR page
  email: text('email'), // HR/contact email, not for login (nullable)
  status: text('status', { enum: ['active', 'terminated', 'leave'] }).default('active'),
}, (t) => ({
  // Performance indexes for common queries
  siteIdx: index('emp_site_idx').on(t.siteId),
  deptIdx: index('emp_dept_idx').on(t.departmentId),
  statusIdx: index('emp_status_idx').on(t.status),
}));

// --- 3. SKILL CATALOG (Version Controlled) ---

export const skills = pgTable('skills', {
  ...commonCols,
  name: text('name').notNull(),
  description: text('description'),
  validityMonths: integer('validity_months'), // Null = Never expires
  maxLevel: integer('max_level').default(1), // How many levels (1-3 typically)
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
}, (t) => ({
  skillStatusIdx: index('rev_skill_status_idx').on(t.skillId, t.status),
}));

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
  
  achievedLevel: integer('achieved_level').default(1).notNull(), // What level they achieved
  achievedAt: timestamp('achieved_at').notNull(),
  expiresAt: timestamp('expires_at'), // Calculated upon insertion
  certifiedByUserId: text('certified_by_user_id').references(() => users.id), // Who signed this off
  notes: text('notes'), // Trainer comments
  
  // Revocation tracking
  revokedAt: timestamp('revoked_at'),
  revokedByUserId: text('revoked_by_user_id').references(() => users.id),
  revocationReason: text('revocation_reason'),
}, (t) => ({
  empSkillIdx: index('empskill_emp_skill_idx').on(t.employeeId, t.skillId),
  expiresIdx: index('empskill_expires_idx').on(t.expiresAt),
}));

// --- 6. FILE ATTACHMENTS (S3/RustFS) ---

export const attachments = pgTable('attachments', {
  ...commonCols,
  s3Key: text('s3_key').notNull(),
  bucket: text('bucket').notNull(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedByUserId: text('uploaded_by_user_id').references(() => users.id),
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

// --- 7. AUDIT LOG (Compliance) ---

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  userId: text('user_id').references(() => users.id), // Who did it (null for system actions)
  action: text('action').notNull(), // 'create', 'update', 'delete', 'revoke', 'certify'
  entityType: text('entity_type').notNull(), // 'employee', 'skill', 'employee_skill', etc.
  entityId: text('entity_id').notNull(),
  oldValue: json('old_value'), // Previous state (for updates)
  newValue: json('new_value'), // New state
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
}, (t) => ({
  entityIdx: index('audit_entity_idx').on(t.entityType, t.entityId),
  timestampIdx: index('audit_timestamp_idx').on(t.timestamp),
  userIdx: index('audit_user_idx').on(t.userId),
}));

// --- 8. RELATIONS ---

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

export const employeeSkillsRelations = relations(employeeSkills, ({ one, many }) => ({
  employee: one(employees, { fields: [employeeSkills.employeeId], references: [employees.id] }),
  skill: one(skills, { fields: [employeeSkills.skillId], references: [skills.id] }),
  revision: one(skillRevisions, { fields: [employeeSkills.skillRevisionId], references: [skillRevisions.id] }),
  certifiedBy: one(users, { fields: [employeeSkills.certifiedByUserId], references: [users.id] }),
  evidence: many(employeeSkillEvidence),
}));
```

---

## Database Triggers & Functions

### Auto-Update `updated_at` Trigger

Create this migration to auto-update timestamps:

```sql
-- Function to update updated_at column
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'updated_at' AND table_schema = 'public'
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON %I;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION trigger_set_updated_at();
    ', t, t);
  END LOOP;
END;
$$;
```

### Soft Delete Query Helper

Create a reusable filter in `src/db/helpers.ts`:

```typescript
import { isNull } from 'drizzle-orm';

// Use like: db.query.employees.findMany({ where: withActive(employees) })
export function withActive<T extends { deletedAt: unknown }>(table: T) {
  return isNull(table.deletedAt);
}

// Or with SQL helper
export const notDeleted = (table: { deletedAt: unknown }) => isNull(table.deletedAt);
```

---

## Gap Analysis SQL Query

The core query for identifying skill gaps:

```sql
-- Get all skill gaps for an employee
WITH employee_context AS (
  SELECT 
    e.id as employee_id,
    e.site_id,
    e.department_id,
    e.role_id
  FROM employees e
  WHERE e.id = $1 AND e.deleted_at IS NULL
),
required_skills AS (
  -- Find all requirements that apply to this employee
  SELECT DISTINCT
    sr.skill_id,
    sr.required_level,
    s.name as skill_name,
    s.validity_months
  FROM skill_requirements sr
  JOIN skills s ON s.id = sr.skill_id AND s.deleted_at IS NULL
  JOIN employee_context ec ON (
    -- Global requirement (all nulls)
    (sr.site_id IS NULL AND sr.department_id IS NULL AND sr.role_id IS NULL AND sr.project_id IS NULL)
    -- Site-specific
    OR sr.site_id = ec.site_id
    -- Department-specific
    OR sr.department_id = ec.department_id
    -- Role-specific
    OR sr.role_id = ec.role_id
    -- TODO: Add project membership check if using projects
  )
  WHERE sr.deleted_at IS NULL
),
employee_current_skills AS (
  -- Get employee's current valid certifications
  SELECT 
    es.skill_id,
    es.achieved_level,
    es.achieved_at,
    es.expires_at,
    es.skill_revision_id,
    sr.status as revision_status
  FROM employee_skills es
  JOIN skill_revisions sr ON sr.id = es.skill_revision_id
  WHERE es.employee_id = $1
    AND es.deleted_at IS NULL
    AND es.revoked_at IS NULL
    AND (es.expires_at IS NULL OR es.expires_at > NOW())
)
SELECT 
  rs.skill_id,
  rs.skill_name,
  rs.required_level,
  ecs.achieved_level,
  ecs.expires_at,
  ecs.revision_status,
  CASE
    WHEN ecs.skill_id IS NULL THEN 'MISSING'
    WHEN ecs.revision_status = 'archived' THEN 'OUTDATED'
    WHEN ecs.achieved_level < rs.required_level THEN 'INSUFFICIENT_LEVEL'
    WHEN ecs.expires_at IS NOT NULL AND ecs.expires_at < NOW() + INTERVAL '30 days' THEN 'EXPIRING_SOON'
    ELSE 'VALID'
  END as status
FROM required_skills rs
LEFT JOIN employee_current_skills ecs ON ecs.skill_id = rs.skill_id
ORDER BY 
  CASE
    WHEN ecs.skill_id IS NULL THEN 1
    WHEN ecs.revision_status = 'archived' THEN 2
    WHEN ecs.achieved_level < rs.required_level THEN 3
    WHEN ecs.expires_at IS NOT NULL AND ecs.expires_at < NOW() + INTERVAL '30 days' THEN 4
    ELSE 5
  END,
  rs.skill_name;
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ORGANIZATION                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────┐    │
│  │  Sites  │◀────▶│  Projects   │      │ Departments │      │  Roles  │    │
│  └─────────┘      └─────────────┘      └─────────────┘      └─────────┘    │
│       │                                       │                   │         │
│       └───────────────────┬───────────────────┴───────────────────┘         │
│                           ▼                                                  │
│                    ┌─────────────┐         ┌─────────┐                      │
│                    │  Employees  │────────▶│  Users  │  (optional link)     │
│                    └─────────────┘         └─────────┘                      │
│                           │                      │                           │
└───────────────────────────┼──────────────────────┼──────────────────────────┘
                            │                      │
┌───────────────────────────┼──────────────────────┼──────────────────────────┐
│                           ▼                      ▼   AUDIT & COMPLIANCE      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐      ┌─────────────────┐      ┌─────────────────────┐   │
│  │ Employee Skills│◀────▶│     Skills      │◀────▶│  Skill Requirements │   │
│  │ + level        │      │ + maxLevel      │      └─────────────────────┘   │
│  │ + notes        │      └─────────────────┘                                 │
│  │ + revokedAt    │              │                                           │
│  └────────────────┘              ▼                                           │
│          │               ┌─────────────────┐      ┌─────────────────────┐   │
│          │               │ Skill Revisions │◀────▶│ Revision Documents  │   │
│          │               └─────────────────┘      └─────────────────────┘   │
│          │                                                   │               │
│          ▼                                                   ▼               │
│  ┌────────────────────┐                          ┌─────────────────────┐    │
│  │ Skill Evidence     │─────────────────────────▶│    Attachments      │    │
│  └────────────────────┘                          │    (S3/RustFS)      │    │
│                                                  └─────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         AUDIT LOGS                                    │   │
│  │  All changes tracked: who, what, when, old/new values                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### Users vs Employees

| Entity | Purpose | Who has one? |
|--------|---------|--------------|
| `users` | Login credentials, app permissions (RBAC) | Trainers, admins, auditors, some employees |
| `employees` | Organizational record, skill tracking | All workers on the floor |

- **Not all employees have logins** — floor workers may only get certified via badge scan
- **Not all users are employees** — external auditors may have view-only access
- **Link:** `employees.userId` (nullable FK)

### Badge Token vs Employee Number

| Field | Purpose |
|-------|---------|
| `employeeNumber` | HR identifier, stable, used in payroll systems |
| `badgeToken` | Random token for QR code URLs, can be regenerated if badge lost |

### Skill Requirements Scoping

Requirements can be scoped at multiple levels (all nullable FKs):

```
Global (all NULL)     → Everyone needs this skill
├── siteId           → Everyone at this site
├── departmentId     → Everyone in this department  
├── roleId           → Everyone with this job role
└── projectId        → Everyone assigned to this project
```

Multiple scopes can be combined (e.g., "Technicians at Austin Plant").

### Certification Revocation

Skills can be revoked (not just deleted) with:
- `revokedAt` - When it was revoked
- `revokedByUserId` - Who revoked it
- `revocationReason` - Why (e.g., "Failed practical assessment", "Disciplinary action")

This maintains the audit trail while invalidating the certification.

---

## Recommended Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `employees` | `(site_id)` | Filter by site |
| `employees` | `(department_id)` | Filter by department |
| `employees` | `(status)` | Filter active employees |
| `skill_revisions` | `(skill_id, status)` | Find active revision for skill |
| `employee_skills` | `(employee_id, skill_id)` | Gap analysis lookup |
| `employee_skills` | `(expires_at)` | Find expiring certifications |
| `audit_logs` | `(entity_type, entity_id)` | Query history for an entity |
| `audit_logs` | `(timestamp)` | Time-range queries |
| `audit_logs` | `(user_id)` | Query actions by user |
