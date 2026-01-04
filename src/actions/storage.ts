"use server";

import { nanoid } from "nanoid";
import { headers } from "next/headers";
import { db } from "@/db";
import { attachments } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { getPresignedUploadUrl, S3_BUCKET } from "@/lib/storage";

async function getContext() {
	try {
		const h = await headers();
		return {
			ipAddress: h.get("x-forwarded-for") || undefined,
			userAgent: h.get("user-agent") || undefined,
		};
	} catch {
		return {};
	}
}

export async function initiateUpload(
	filename: string,
	contentType: string,
	size: number,
) {
	// Basic validation
	if (!filename || !contentType) {
		return { success: false, error: "Invalid file metadata" };
	}

	const ext = filename.split(".").pop();
	const key = `uploads/${nanoid()}.${ext}`;

	try {
		const uploadUrl = await getPresignedUploadUrl(key, contentType);

		// Return necessary info for the client to perform the upload
		return {
			success: true,
			data: {
				uploadUrl,
				key,
				// Simple public URL assumption (if bucket is public)
				// Adjust based on actual storage URL strategy
				publicUrl: `${process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`,
			},
		};
	} catch (error) {
		console.error("Failed to initiate upload:", error);
		return { success: false, error: "Failed to generate upload URL" };
	}
}

export async function recordAttachment(data: {
	name: string;
	key: string;
	url: string;
	mimeType: string;
	size: number;
	employeeSkillId?: string;
	userId?: string;
}) {
	const context = await getContext();

	try {
		const [att] = await db
			.insert(attachments)
			.values({
				filename: data.name,
				s3Key: data.key,
				bucket: S3_BUCKET,
				mimeType: data.mimeType,
				sizeBytes: data.size,
				uploadedByUserId: data.userId,
				// Note: Schema doesn't have employeeSkillId on attachments check,
				// it has employeeSkillEvidence join table.
				// But we can create the attachment first.
			})
			.returning();

		// If employeeSkillId is provided, I should link it?
		// But employeeSkillEvidence table is for that.
		// For now, allow creating the attachment record.
		// The join table update should happen in the specific action or here if extended.

		await logAudit({
			action: "create",
			entityType: "attachment",
			entityId: att.id,
			newValue: att,
			context,
		});

		return { success: true, data: att };
	} catch (error) {
		console.error("Failed to record attachment:", error);
		return { success: false, error: "Failed to record attachment" };
	}
}
