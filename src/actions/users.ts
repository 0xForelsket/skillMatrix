"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { type AuditContext, logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";

// =============================================================================
// Schemas
// =============================================================================

const createUserSchema = z.object({
	email: z.string().email(),
	password: z.string().min(8, "Password must be at least 8 characters"),
	appRole: z
		.enum(["admin", "skill_manager", "trainer", "auditor", "viewer"])
		.default("viewer"),
});

const updateUserSchema = z.object({
	id: z.string(),
	appRole: z
		.enum(["admin", "skill_manager", "trainer", "auditor", "viewer"])
		.optional(),
	status: z.enum(["active", "disabled"]).optional(),
	email: z.string().email().optional(),
});

// =============================================================================
// Helpers
// =============================================================================

async function getContext(performerId?: string): Promise<AuditContext> {
	try {
		const headersList = await headers();
		return {
			userId: performerId,
			ipAddress: headersList.get("x-forwarded-for") || undefined,
			userAgent: headersList.get("user-agent") || undefined,
		};
	} catch (_) {
		// Fallback for non-request environments (scripts, seeders)
		return {
			userId: performerId,
		};
	}
}

function safeRevalidatePath(path: string) {
	try {
		revalidatePath(path);
	} catch (_) {
		// Ignore in script context
	}
}

// =============================================================================
// Actions
// =============================================================================

export async function createUser(
	data: z.infer<typeof createUserSchema> & { performerId?: string },
) {
	const parsed = createUserSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const { email, password, appRole } = parsed.data;
	const { performerId } = data;

	try {
		const existingUser = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (existingUser) {
			return { success: false, error: "User with this email already exists" };
		}

		const hashedPassword = await hashPassword(password);
		const context = await getContext(performerId);

		const newUser = await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(users)
				.values({
					email,
					passwordHash: hashedPassword,
					appRole,
					status: "active",
				})
				.returning();
			return inserted;
		});

		// Audit Log
		await logAudit({
			action: "create",
			entityType: "user",
			entityId: newUser.id,
			newValue: { ...newUser, passwordHash: "[REDACTED]" },
			context,
		});

		safeRevalidatePath("/admin/users");

		const { passwordHash: _, ...safeUser } = newUser;
		return { success: true, data: safeUser };
	} catch (error) {
		console.error("Failed to create user:", error);
		return { success: false, error: "Failed to create user" };
	}
}

export async function updateUser(
	data: z.infer<typeof updateUserSchema> & { performerId?: string },
) {
	const parsed = updateUserSchema.safeParse(data);
	if (!parsed.success) {
		return { success: false, error: parsed.error.format() };
	}

	const { id, appRole, status, email } = parsed.data;
	const { performerId } = data;

	try {
		const existingUser = await db.query.users.findFirst({
			where: eq(users.id, id),
		});

		if (!existingUser) {
			return { success: false, error: "User not found" };
		}

		const context = await getContext(performerId);

		const updatedUser = await db.transaction(async (tx) => {
			const [updated] = await tx
				.update(users)
				.set({
					...(appRole ? { appRole } : {}),
					...(status ? { status } : {}),
					...(email ? { email } : {}),
					updatedAt: new Date(),
				})
				.where(eq(users.id, id))
				.returning();
			return updated;
		});

		await logAudit({
			action: "update",
			entityType: "user",
			entityId: id,
			oldValue: { ...existingUser, passwordHash: "[REDACTED]" },
			newValue: { ...updatedUser, passwordHash: "[REDACTED]" },
			context,
		});

		safeRevalidatePath("/admin/users");
		safeRevalidatePath(`/admin/users/${id}`);

		const { passwordHash: _, ...safeUser } = updatedUser;
		return { success: true, data: safeUser };
	} catch (error) {
		console.error("Failed to update user:", error);
		return { success: false, error: "Failed to update user" };
	}
}

export async function getUser(id: string) {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.id, id),
		});

		if (!user) return { success: false, error: "User not found" };

		const { passwordHash: _, ...safeUser } = user;
		return { success: true, data: safeUser };
	} catch (_) {
		return { success: false, error: "Failed to fetch user" };
	}
}

export async function getUserByEmail(email: string) {
	try {
		const user = await db.query.users.findFirst({
			where: eq(users.email, email),
		});

		if (!user) return { success: false, error: "User not found" };

		const { passwordHash: _, ...safeUser } = user;
		return { success: true, data: safeUser };
	} catch (_) {
		return { success: false, error: "Failed to fetch user" };
	}
}

export async function listUsers() {
	try {
		const allUsers = await db.query.users.findMany({
			orderBy: (users, { desc }) => [desc(users.createdAt)],
		});

		const safeUsers = allUsers.map(({ passwordHash: _, ...u }) => u);
		return { success: true, data: safeUsers };
	} catch (_) {
		return { success: false, error: "Failed to list users" };
	}
}
