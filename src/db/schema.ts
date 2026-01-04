/**
 * Caliber Database Schema
 *
 * Design Principles:
 * 1. UUIDv7 for IDs - sortable, globally unique, application-generated
 * 2. Soft Deletes - deletedAt column for compliance/audit trails
 * 3. Users ≠ Employees - Authentication separate from business entities
 * 4. Version-Controlled Skills - Employees certified on specific revisions
 * 5. Audit Everything - All changes logged for compliance
 *
 * See docs/schema.md for full documentation and ERD.
 */

import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { generateId } from "@/lib/id";

// =============================================================================
// Common Column Definitions
// =============================================================================

const id = {
	id: text("id").primaryKey().$defaultFn(generateId),
};

const timestamps = {
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
};

const softDelete = {
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

const commonCols = {
	...id,
	...timestamps,
	...softDelete,
};

// =============================================================================
// 1. ORGANIZATION (Physical & Logical)
// =============================================================================

export const sites = pgTable("sites", {
	...commonCols,
	name: text("name").notNull(), // e.g., "Austin Plant"
	code: text("code").notNull().unique(), // e.g., "ATX-01"
	timezone: text("timezone").default("UTC"),
});

export const departments = pgTable("departments", {
	...commonCols,
	name: text("name").notNull(),
});

export const roles = pgTable("roles", {
	...commonCols,
	name: text("name").notNull(),
});

export const projects = pgTable("projects", {
	...commonCols,
	siteId: text("site_id")
		.references(() => sites.id)
		.notNull(),
	departmentId: text("department_id").references(() => departments.id),
	name: text("name").notNull(), // "Line 4", "Project Zeus"
	isActive: boolean("is_active").default(true),
});

// =============================================================================
// 2. AUTHENTICATION (Separate from Business Entities)
// =============================================================================

/**
 * Users table - for authentication and app permissions.
 * Not all employees have logins. External auditors may have logins but no employee record.
 */
export const users = pgTable("users", {
	...id,
	...timestamps,
	email: text("email").notNull().unique(),
	passwordHash: text("password_hash"), // Null if SSO-only
	appRole: text("app_role", {
		enum: ["admin", "skill_manager", "trainer", "auditor", "viewer"],
	}).default("viewer"),
	status: text("status", { enum: ["active", "disabled"] }).default("active"),
});

/**
 * Employees table - organizational/HR records for skill tracking.
 * May or may not have a linked user account for app access.
 */
export const employees = pgTable(
	"employees",
	{
		...commonCols,
		userId: text("user_id").references(() => users.id), // Nullable - only if employee has app access
		siteId: text("site_id")
			.references(() => sites.id)
			.notNull(),
		departmentId: text("department_id").references(() => departments.id),
		roleId: text("role_id").references(() => roles.id), // Job title, NOT app permissions
		employeeNumber: text("employee_number").notNull().unique(), // HR identifier (e.g., "EMP-0042")
		badgeToken: text("badge_token").notNull().unique(), // Random token for QR code URL
		name: text("name").notNull(),
		photoUrl: text("photo_url"), // Optional employee photo
		email: text("email"), // HR/contact email, not for login
		status: text("status", { enum: ["active", "terminated", "leave"] }).default(
			"active",
		),
	},
	(t) => [
		index("emp_site_idx").on(t.siteId),
		index("emp_dept_idx").on(t.departmentId),
		index("emp_status_idx").on(t.status),
	],
);

// Join table for Employees and Projects (Many-to-Many)
export const employeeProjects = pgTable(
	"employee_projects",
	{
		employeeId: text("employee_id")
			.references(() => employees.id)
			.notNull(),
		projectId: text("project_id")
			.references(() => projects.id)
			.notNull(),
		assignedAt: timestamp("assigned_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		primaryKey({ columns: [t.employeeId, t.projectId] }),
		index("empproj_emp_idx").on(t.employeeId),
		index("empproj_proj_idx").on(t.projectId),
	],
);

// =============================================================================
// 3. SKILL CATALOG (Version Controlled)
// =============================================================================

export const skills = pgTable("skills", {
	...commonCols,
	name: text("name").notNull(),
	description: text("description"),
	validityMonths: integer("validity_months"), // Null = Never expires
	maxLevel: integer("max_level").default(1), // How many levels (1-3 typically)
	code: text("code"), // e.g., "SOP-104"
});

export const skillRevisions = pgTable(
	"skill_revisions",
	{
		...commonCols,
		skillId: text("skill_id")
			.references(() => skills.id)
			.notNull(),
		revisionLabel: text("revision_label").notNull(), // "Rev A", "Rev B"
		changeLog: text("change_log"),
		status: text("status", { enum: ["draft", "active", "archived"] }).default(
			"draft",
		),
		effectiveDate: timestamp("effective_date", { withTimezone: true }),
		requiresRetraining: boolean("requires_retraining").default(true),
	},
	(t) => [index("rev_skill_status_idx").on(t.skillId, t.status)],
);

// =============================================================================
// 4. REQUIREMENT MATRIX (The Rules Engine)
// =============================================================================

/**
 * Skill requirements define who needs which skills.
 * Scoping is done via nullable FKs:
 * - All NULL = global requirement for everyone
 * - siteId set = everyone at that site
 * - departmentId set = everyone in that department
 * - roleId set = everyone with that job role
 * - projectId set = everyone assigned to that project
 */
export const skillRequirements = pgTable(
	"skill_requirements",
	{
		...commonCols,
		skillId: text("skill_id")
			.references(() => skills.id)
			.notNull(),
		// THE SCOPE SELECTORS (Nullable FKs)
		siteId: text("site_id").references(() => sites.id),
		departmentId: text("department_id").references(() => departments.id),
		roleId: text("role_id").references(() => roles.id),
		projectId: text("project_id").references(() => projects.id),
		requiredLevel: integer("required_level").default(1),
	},
	(t) => [
		uniqueIndex("req_scope_idx").on(
			t.skillId,
			t.siteId,
			t.departmentId,
			t.roleId,
			t.projectId,
		),
	],
);

// =============================================================================
// 5. EMPLOYEE SKILLS (Certifications / The Transcript)
// =============================================================================

export const employeeSkills = pgTable(
	"employee_skills",
	{
		...commonCols,
		employeeId: text("employee_id")
			.references(() => employees.id)
			.notNull(),
		skillId: text("skill_id")
			.references(() => skills.id)
			.notNull(),
		skillRevisionId: text("skill_revision_id")
			.references(() => skillRevisions.id)
			.notNull(),
		achievedLevel: integer("achieved_level").default(1).notNull(),
		achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }), // Calculated upon insertion
		certifiedByUserId: text("certified_by_user_id").references(() => users.id),
		notes: text("notes"), // Trainer comments
		// Revocation tracking
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		revokedByUserId: text("revoked_by_user_id").references(() => users.id),
		revocationReason: text("revocation_reason"),
	},
	(t) => [
		index("empskill_emp_skill_idx").on(t.employeeId, t.skillId),
		index("empskill_expires_idx").on(t.expiresAt),
	],
);

// =============================================================================
// 6. FILE ATTACHMENTS (S3/MinIO/RustFS)
// =============================================================================

export const attachments = pgTable("attachments", {
	...commonCols,
	s3Key: text("s3_key").notNull(),
	bucket: text("bucket").notNull(),
	filename: text("filename").notNull(),
	mimeType: text("mime_type"),
	sizeBytes: integer("size_bytes"),
	uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
});

// Link SOPs/documents to Revisions
export const skillRevisionDocuments = pgTable("skill_revision_documents", {
	...id,
	skillRevisionId: text("skill_revision_id")
		.references(() => skillRevisions.id)
		.notNull(),
	attachmentId: text("attachment_id")
		.references(() => attachments.id)
		.notNull(),
	type: text("type", { enum: ["sop", "visual_aid", "quiz"] }).default("sop"),
});

// Link evidence to employee skill records
export const employeeSkillEvidence = pgTable("employee_skill_evidence", {
	...id,
	employeeSkillId: text("employee_skill_id")
		.references(() => employeeSkills.id)
		.notNull(),
	attachmentId: text("attachment_id")
		.references(() => attachments.id)
		.notNull(),
});

// =============================================================================
// 7. AUDIT LOG (Compliance)
// =============================================================================

export const auditLogs = pgTable(
	"audit_logs",
	{
		...id,
		timestamp: timestamp("timestamp", { withTimezone: true })
			.defaultNow()
			.notNull(),
		userId: text("user_id").references(() => users.id), // Null for system actions
		action: text("action").notNull(), // 'create', 'update', 'delete', 'revoke', 'certify'
		entityType: text("entity_type").notNull(), // 'employee', 'skill', etc.
		entityId: text("entity_id").notNull(),
		oldValue: json("old_value"), // Previous state (for updates)
		newValue: json("new_value"), // New state
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
	},
	(t) => [
		index("audit_entity_idx").on(t.entityType, t.entityId),
		index("audit_timestamp_idx").on(t.timestamp),
		index("audit_user_idx").on(t.userId),
	],
);

// =============================================================================
// 8. RELATIONS
// =============================================================================

export const sitesRelations = relations(sites, ({ many }) => ({
	employees: many(employees),
	projects: many(projects),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
	employees: many(employees),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
	employees: many(employees),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
	site: one(sites, { fields: [projects.siteId], references: [sites.id] }),
	department: one(departments, {
		fields: [projects.departmentId],
		references: [departments.id],
	}),
	employees: many(employeeProjects),
}));

export const usersRelations = relations(users, ({ one }) => ({
	employee: one(employees, {
		fields: [users.id],
		references: [employees.userId],
	}),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
	user: one(users, { fields: [employees.userId], references: [users.id] }),
	site: one(sites, { fields: [employees.siteId], references: [sites.id] }),
	department: one(departments, {
		fields: [employees.departmentId],
		references: [departments.id],
	}),
	role: one(roles, { fields: [employees.roleId], references: [roles.id] }),
	skills: many(employeeSkills),
	projects: many(employeeProjects),
}));

export const employeeProjectsRelations = relations(
	employeeProjects,
	({ one }) => ({
		employee: one(employees, {
			fields: [employeeProjects.employeeId],
			references: [employees.id],
		}),
		project: one(projects, {
			fields: [employeeProjects.projectId],
			references: [projects.id],
		}),
	}),
);

export const skillsRelations = relations(skills, ({ many }) => ({
	revisions: many(skillRevisions),
	requirements: many(skillRequirements),
}));

export const skillRevisionsRelations = relations(
	skillRevisions,
	({ one, many }) => ({
		skill: one(skills, {
			fields: [skillRevisions.skillId],
			references: [skills.id],
		}),
		documents: many(skillRevisionDocuments),
	}),
);

export const skillRequirementsRelations = relations(
	skillRequirements,
	({ one }) => ({
		skill: one(skills, {
			fields: [skillRequirements.skillId],
			references: [skills.id],
		}),
		site: one(sites, {
			fields: [skillRequirements.siteId],
			references: [sites.id],
		}),
		department: one(departments, {
			fields: [skillRequirements.departmentId],
			references: [departments.id],
		}),
		role: one(roles, {
			fields: [skillRequirements.roleId],
			references: [roles.id],
		}),
		project: one(projects, {
			fields: [skillRequirements.projectId],
			references: [projects.id],
		}),
	}),
);

export const employeeSkillsRelations = relations(
	employeeSkills,
	({ one, many }) => ({
		employee: one(employees, {
			fields: [employeeSkills.employeeId],
			references: [employees.id],
		}),
		skill: one(skills, {
			fields: [employeeSkills.skillId],
			references: [skills.id],
		}),
		revision: one(skillRevisions, {
			fields: [employeeSkills.skillRevisionId],
			references: [skillRevisions.id],
		}),
		certifiedBy: one(users, {
			fields: [employeeSkills.certifiedByUserId],
			references: [users.id],
		}),
		evidence: many(employeeSkillEvidence),
	}),
);

export const attachmentsRelations = relations(attachments, ({ one }) => ({
	uploadedBy: one(users, {
		fields: [attachments.uploadedByUserId],
		references: [users.id],
	}),
}));

export const skillRevisionDocumentsRelations = relations(
	skillRevisionDocuments,
	({ one }) => ({
		revision: one(skillRevisions, {
			fields: [skillRevisionDocuments.skillRevisionId],
			references: [skillRevisions.id],
		}),
		attachment: one(attachments, {
			fields: [skillRevisionDocuments.attachmentId],
			references: [attachments.id],
		}),
	}),
);

export const employeeSkillEvidenceRelations = relations(
	employeeSkillEvidence,
	({ one }) => ({
		employeeSkill: one(employeeSkills, {
			fields: [employeeSkillEvidence.employeeSkillId],
			references: [employeeSkills.id],
		}),
		attachment: one(attachments, {
			fields: [employeeSkillEvidence.attachmentId],
			references: [attachments.id],
		}),
	}),
);

// =============================================================================
// Type Exports
// =============================================================================

export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

export type EmployeeProject = typeof employeeProjects.$inferSelect;
export type NewEmployeeProject = typeof employeeProjects.$inferInsert;

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;

export type SkillRevision = typeof skillRevisions.$inferSelect;
export type NewSkillRevision = typeof skillRevisions.$inferInsert;

export type SkillRequirement = typeof skillRequirements.$inferSelect;
export type NewSkillRequirement = typeof skillRequirements.$inferInsert;

export type EmployeeSkill = typeof employeeSkills.$inferSelect;
export type NewEmployeeSkill = typeof employeeSkills.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
