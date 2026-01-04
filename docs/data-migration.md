# Data Migration Patterns

Common data migration scenarios and how to handle them safely.

## Table of Contents

- [General Principles](#general-principles)
- [Migration: Skill Level Change](#migration-skill-level-change)
- [Migration: Department Rename/Merge](#migration-department-renamemerge)
- [Migration: Site Merge](#migration-site-merge)
- [Migration: Skill Revision Rollback](#migration-skill-revision-rollback)
- [Migration: Bulk Employee Import](#migration-bulk-employee-import)
- [Testing Migrations](#testing-migrations)

---

## General Principles

1. **Always audit.** Every migration must create audit log entries.
2. **Never delete.** Use soft deletes or archival, never `DELETE`.
3. **Test on staging.** Run migrations on a staging database with production data copy.
4. **Backup first.** Create a database backup before any migration.
5. **Dry run.** Run with `SELECT` first to preview affected rows.

---

## Migration: Skill Level Change

**Scenario:** A skill's `maxLevel` changes from 2 to 3.

**Impact:** 
- Existing Level 2 certifications are still valid
- Gap analysis may show "INSUFFICIENT_LEVEL" for employees who now need Level 3

**Steps:**

```sql
-- 1. Identify affected requirements
SELECT sr.*, s.name as skill_name
FROM skill_requirements sr
JOIN skills s ON s.id = sr.skill_id
WHERE sr.skill_id = '<skill-id>'
  AND sr.required_level > 2;  -- This would fail with old max

-- 2. Update the skill (via app, not direct SQL, to trigger audit)
UPDATE skills SET max_level = 3, updated_at = NOW() WHERE id = '<skill-id>';

-- 3. Create new revision if training content changed
INSERT INTO skill_revisions (id, skill_id, revision_label, status, requires_retraining)
VALUES (gen_random_uuid(), '<skill-id>', 'Rev C - Level 3 Added', 'active', false);

-- 4. Update requirements to require Level 3 where needed
UPDATE skill_requirements 
SET required_level = 3, updated_at = NOW()
WHERE skill_id = '<skill-id>' 
  AND role_id IN (SELECT id FROM roles WHERE name LIKE '%Lead%');
```

**Validation:**
```sql
-- Check gap analysis for affected employees
SELECT e.name, e.employee_number, 
       CASE WHEN es.achieved_level < 3 THEN 'NEEDS_RETRAINING' ELSE 'OK' END as status
FROM employees e
JOIN employee_skills es ON es.employee_id = e.id
WHERE es.skill_id = '<skill-id>' AND es.revoked_at IS NULL;
```

---

## Migration: Department Rename/Merge

**Scenario:** "Assembly" merges into "Production".

**Impact:**
- Employees in "Assembly" move to "Production"
- Skill requirements scoped to "Assembly" need updating
- Reports should show historical department

**Steps:**

```sql
-- 1. Find affected records
SELECT COUNT(*) as employee_count FROM employees WHERE department_id = '<assembly-id>';
SELECT COUNT(*) as requirement_count FROM skill_requirements WHERE department_id = '<assembly-id>';

-- 2. Update employees (preserve in audit log)
UPDATE employees 
SET department_id = '<production-id>', updated_at = NOW()
WHERE department_id = '<assembly-id>' AND deleted_at IS NULL;

-- 3. Update skill requirements
UPDATE skill_requirements 
SET department_id = '<production-id>', updated_at = NOW()
WHERE department_id = '<assembly-id>' AND deleted_at IS NULL;

-- 4. Soft-delete the old department
UPDATE departments SET deleted_at = NOW() WHERE id = '<assembly-id>';
```

> ⚠️ **Important:** Run the employee update through the application's `updateEmployee` action to create proper audit logs, not direct SQL.

**Bulk Update via Application:**

```typescript
// src/scripts/merge-departments.ts
import { db } from '@/db';
import { employees, skillRequirements, departments } from '@/db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { logAudit } from '@/lib/audit';

async function mergeDepartments(fromId: string, toId: string) {
  const affected = await db.query.employees.findMany({
    where: and(eq(employees.departmentId, fromId), isNull(employees.deletedAt)),
  });

  for (const emp of affected) {
    await db.update(employees)
      .set({ departmentId: toId })
      .where(eq(employees.id, emp.id));
    
    await logAudit('update', 'employee', emp.id, 
      { departmentId: fromId }, 
      { departmentId: toId }
    );
  }

  // Soft-delete old department
  await db.update(departments)
    .set({ deletedAt: new Date() })
    .where(eq(departments.id, fromId));

  console.log(`Migrated ${affected.length} employees from ${fromId} to ${toId}`);
}
```

---

## Migration: Site Merge

**Scenario:** Detroit plant closes, employees transfer to Austin.

**Impact:**
- Employees change sites
- Projects at Detroit need archiving
- Site-scoped requirements need review

**Steps:**

```sql
-- 1. Archive Detroit projects
UPDATE projects SET is_active = false, updated_at = NOW()
WHERE site_id = '<detroit-id>';

-- 2. Migrate employees (mark as leave first if not immediate)
UPDATE employees 
SET site_id = '<austin-id>', updated_at = NOW()
WHERE site_id = '<detroit-id>' AND deleted_at IS NULL;

-- 3. Review site-scoped requirements
-- Detroit-specific skills may not apply at Austin
SELECT sr.*, s.name 
FROM skill_requirements sr
JOIN skills s ON s.id = sr.skill_id
WHERE sr.site_id = '<detroit-id>';

-- 4. Soft-delete site
UPDATE sites SET deleted_at = NOW() WHERE id = '<detroit-id>';
```

---

## Migration: Skill Revision Rollback

**Scenario:** A new revision (Rev C) was activated but has errors; need to rollback to Rev B.

**Impact:**
- Employees certified on Rev C need handling
- Rev C should be archived, Rev B re-activated

**Steps:**

```sql
-- 1. Archive the problematic revision
UPDATE skill_revisions 
SET status = 'archived', updated_at = NOW()
WHERE id = '<rev-c-id>';

-- 2. Re-activate the previous revision
UPDATE skill_revisions 
SET status = 'active', updated_at = NOW()
WHERE id = '<rev-b-id>';

-- 3. Decide on Rev C certifications:
-- Option A: Keep them (they trained, even if on bad revision)
-- Option B: Invalidate them (require retraining)

-- Option B: Mark as needing retraining
UPDATE employee_skills 
SET notes = COALESCE(notes, '') || ' [RETRAINING REQUIRED: Rev C rollback]', 
    updated_at = NOW()
WHERE skill_revision_id = '<rev-c-id>' AND revoked_at IS NULL;
```

---

## Migration: Bulk Employee Import

**Scenario:** HR provides a CSV of 500 new employees.

**Steps:**

1. **Validate CSV format:**
   ```typescript
   const employeeSchema = z.object({
     employeeNumber: z.string().min(1),
     name: z.string().min(1),
     email: z.string().email().optional(),
     siteCode: z.string(),
     departmentName: z.string(),
     roleName: z.string(),
   });
   ```

2. **Map site/department/role codes to IDs:**
   ```typescript
   const siteMap = await db.query.sites.findMany().then(
     rows => Object.fromEntries(rows.map(r => [r.code, r.id]))
   );
   ```

3. **Generate badge tokens:**
   ```typescript
   import { nanoid } from 'nanoid';
   const badgeToken = nanoid(21);  // Secure, URL-safe
   ```

4. **Insert with conflict handling:**
   ```typescript
   for (const row of csvData) {
     try {
       await db.insert(employees).values({
         id: uuidv7(),
         employeeNumber: row.employeeNumber,
         name: row.name,
         siteId: siteMap[row.siteCode],
         // ... other fields
         badgeToken: nanoid(21),
       }).onConflictDoNothing();  // Skip if employeeNumber exists
     } catch (error) {
       errors.push({ row, error: error.message });
     }
   }
   ```

5. **Generate summary report:**
   ```typescript
   console.log(`Import complete: ${imported} created, ${skipped} skipped, ${errors.length} errors`);
   ```

---

## Testing Migrations

Before running any migration on production:

### 1. Create Staging Copy

```bash
# Dump production
pg_dump -U admin caliber > caliber_backup_$(date +%Y%m%d).sql

# Restore to staging
psql -U admin caliber_staging < caliber_backup_$(date +%Y%m%d).sql
```

### 2. Run Migration on Staging

```bash
DATABASE_URL=postgres://admin:password@localhost:5432/caliber_staging \
  bun run src/scripts/your-migration.ts
```

### 3. Validate

```sql
-- Check for orphaned records
SELECT * FROM employees e
WHERE e.department_id NOT IN (SELECT id FROM departments WHERE deleted_at IS NULL);

-- Check audit logs were created
SELECT * FROM audit_logs WHERE timestamp > NOW() - INTERVAL '1 hour';

-- Run gap analysis sample
SELECT * FROM get_employee_gaps('<employee-id>');
```

### 4. Rollback Plan

Always have a rollback script ready:

```sql
-- Example: Undo department merge
UPDATE employees SET department_id = '<assembly-id>' 
WHERE id IN (SELECT entity_id FROM audit_logs 
             WHERE action = 'update' AND entity_type = 'employee'
             AND old_value->>'departmentId' = '<assembly-id>'
             AND timestamp > '<migration-timestamp>');

UPDATE departments SET deleted_at = NULL WHERE id = '<assembly-id>';
```

---

## Common Pitfalls

| Mistake | Why It's Bad | Prevention |
|---------|--------------|------------|
| Direct SQL updates | No audit trail | Always use application layer |
| Hard deletes | Data loss, broken FKs | Always soft delete |
| Migrating during business hours | Locks, contention | Schedule maintenance window |
| No dry run | Unexpected scope | Always preview with SELECT |
| Single transaction for large updates | Lock contention | Batch in chunks of 100-500 |
