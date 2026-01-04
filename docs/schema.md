# Database Schema

This schema is designed for Drizzle ORM with PostgreSQL. It enforces **Site Scoping**, **Version Control**, and **UUIDv7** throughout.

## Design Principles

1. **UUIDv7 for IDs:** Sortable, globally unique, application-generated
2. **Soft Deletes:** `deletedAt` column for compliance/audit trails
3. **Users ≠ Employees:** Authentication is separate from business entities
4. **Version-Controlled Skills:** Skills have revisions; employees are certified on specific revisions

---

## Complete Schema (`src/db/schema.ts`)

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
│                           │                                                  │
└───────────────────────────┼─────────────────────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────────────────────┐
│                           ▼          SKILL CATALOG                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐      ┌─────────────────┐      ┌─────────────────────┐   │
│  │ Employee Skills│◀────▶│     Skills      │◀────▶│  Skill Requirements │   │
│  └────────────────┘      └─────────────────┘      └─────────────────────┘   │
│          │                       │                                           │
│          │                       ▼                                           │
│          │               ┌─────────────────┐      ┌─────────────────────┐   │
│          │               │ Skill Revisions │◀────▶│ Revision Documents  │   │
│          │               └─────────────────┘      └─────────────────────┘   │
│          │                                                   │               │
│          ▼                                                   ▼               │
│  ┌────────────────────┐                          ┌─────────────────────┐    │
│  │ Skill Evidence     │─────────────────────────▶│    Attachments      │    │
│  └────────────────────┘                          └─────────────────────┘    │
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
