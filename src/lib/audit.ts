/**
 * Audit Logging Service
 *
 * Tracks all data changes for compliance and debugging.
 * Every create, update, delete, revoke, and certify action is logged.
 */

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { generateId } from "@/lib/id";

export type AuditAction =
	| "create"
	| "update"
	| "delete"
	| "revoke"
	| "certify"
	| "login"
	| "logout"
	| "login_failed"
	| "permission_denied";

export type EntityType =
	| "site"
	| "department"
	| "role"
	| "project"
	| "user"
	| "employee"
	| "skill"
	| "skill_revision"
	| "skill_requirement"
	| "employee_skill"
	| "certification"
	| "attachment"
	| "session";

export interface AuditContext {
	userId?: string | null;
	ipAddress?: string;
	userAgent?: string;
}

/**
 * Log an audit entry for a data change.
 *
 * @example
 * await logAudit({
 *   action: 'create',
 *   entityType: 'employee',
 *   entityId: employee.id,
 *   newValue: employee,
 *   context: { userId: session.user.id }
 * });
 *
 * @example
 * await logAudit({
 *   action: 'update',
 *   entityType: 'skill',
 *   entityId: skill.id,
 *   oldValue: previousSkill,
 *   newValue: updatedSkill,
 *   context: { userId: session.user.id }
 * });
 */
export async function logAudit({
	action,
	entityType,
	entityId,
	oldValue,
	newValue,
	context = {},
}: {
	action: AuditAction;
	entityType: EntityType;
	entityId: string;
	oldValue?: unknown;
	newValue?: unknown;
	context?: AuditContext;
}): Promise<void> {
	await db.insert(auditLogs).values({
		id: generateId(),
		action,
		entityType,
		entityId,
		oldValue: oldValue ?? null,
		newValue: newValue ?? null,
		userId: context.userId ?? null,
		ipAddress: context.ipAddress ?? null,
		userAgent: context.userAgent ?? null,
	});
}

/**
 * Helper to create audit context from a request.
 * Use in Server Actions or API routes.
 *
 * @example
 * const context = getAuditContext(request, session.user.id);
 * await logAudit({ ...params, context });
 */
export function getAuditContext(
	request: Request | null,
	userId?: string | null,
): AuditContext {
	if (!request) {
		return { userId };
	}

	return {
		userId,
		ipAddress:
			request.headers.get("x-forwarded-for") ||
			request.headers.get("x-real-ip") ||
			undefined,
		userAgent: request.headers.get("user-agent") || undefined,
	};
}

/**
 * Wrap a database operation with automatic audit logging.
 *
 * @example
 * const employee = await withAudit(
 *   () => db.insert(employees).values(data).returning(),
 *   {
 *     action: 'create',
 *     entityType: 'employee',
 *     getEntityId: (result) => result[0].id,
 *     getNewValue: (result) => result[0],
 *     context: { userId: session.user.id }
 *   }
 * );
 */
export async function withAudit<T>(
	operation: () => Promise<T>,
	{
		action,
		entityType,
		getEntityId,
		getOldValue,
		getNewValue,
		context = {},
	}: {
		action: AuditAction;
		entityType: EntityType;
		getEntityId: (result: T) => string;
		getOldValue?: (result: T) => unknown;
		getNewValue?: (result: T) => unknown;
		context?: AuditContext;
	},
): Promise<T> {
	const result = await operation();

	await logAudit({
		action,
		entityType,
		entityId: getEntityId(result),
		oldValue: getOldValue?.(result),
		newValue: getNewValue?.(result),
		context,
	});

	return result;
}

// ============================================================================
// Auth-specific Audit Helpers
// ============================================================================

export interface AuthAuditDetails {
	email?: string;
	reason?: string;
	provider?: string;
	[key: string]: unknown;
}

/**
 * Log a successful login event.
 *
 * @example
 * await logAuthLogin({
 *   userId: user.id,
 *   details: { email: user.email, provider: 'credentials' }
 * });
 */
export async function logAuthLogin({
	userId,
	details = {},
	context = {},
}: {
	userId: string;
	details?: AuthAuditDetails;
	context?: AuditContext;
}): Promise<void> {
	await logAudit({
		action: "login",
		entityType: "session",
		entityId: userId,
		newValue: {
			timestamp: new Date().toISOString(),
			...details,
		},
		context: { ...context, userId },
	});
}

/**
 * Log a failed login attempt (invalid credentials, disabled account, etc.).
 *
 * @example
 * await logAuthLoginFailed({
 *   email: 'user@example.com',
 *   reason: 'invalid_password',
 *   context: { ipAddress: '192.168.1.1' }
 * });
 */
export async function logAuthLoginFailed({
	email,
	reason,
	context = {},
}: {
	email: string;
	reason: "invalid_credentials" | "account_disabled" | "account_not_found" | "validation_error";
	context?: AuditContext;
}): Promise<void> {
	await logAudit({
		action: "login_failed",
		entityType: "session",
		entityId: "anonymous",
		newValue: {
			email,
			reason,
			timestamp: new Date().toISOString(),
		},
		context,
	});
}

/**
 * Log a logout event.
 *
 * @example
 * await logAuthLogout({ userId: user.id });
 */
export async function logAuthLogout({
	userId,
	context = {},
}: {
	userId: string;
	context?: AuditContext;
}): Promise<void> {
	await logAudit({
		action: "logout",
		entityType: "session",
		entityId: userId,
		newValue: {
			timestamp: new Date().toISOString(),
		},
		context: { ...context, userId },
	});
}

/**
 * Log a permission denied event (attempted unauthorized access).
 *
 * @example
 * await logAuthPermissionDenied({
 *   userId: user.id,
 *   resource: '/admin/users',
 *   requiredRole: 'admin',
 *   userRole: 'viewer'
 * });
 */
export async function logAuthPermissionDenied({
	userId,
	resource,
	requiredRole,
	userRole,
	context = {},
}: {
	userId?: string | null;
	resource: string;
	requiredRole?: string;
	userRole?: string;
	context?: AuditContext;
}): Promise<void> {
	await logAudit({
		action: "permission_denied",
		entityType: "session",
		entityId: userId ?? "anonymous",
		newValue: {
			resource,
			requiredRole,
			userRole,
			timestamp: new Date().toISOString(),
		},
		context: { ...context, userId },
	});
}
