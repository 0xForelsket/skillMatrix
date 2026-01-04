import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://localhost:9000";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;
export const S3_BUCKET = process.env.S3_BUCKET || "caliber-storage";

if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
	console.warn("S3 credentials not found. File uploads will fail.");
}

export const s3Client = new S3Client({
	region: S3_REGION,
	endpoint: S3_ENDPOINT,
	credentials: {
		accessKeyId: S3_ACCESS_KEY || "",
		secretAccessKey: S3_SECRET_KEY || "",
	},
	forcePathStyle: true, // Needed for MinIO/RustFS usually
});

export async function getPresignedUploadUrl(key: string, contentType: string) {
	const command = new PutObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
		ContentType: contentType,
		// ACL: "public-read", // Depends on bucket policy, safer to use private and signed GETs or public bucket policy
	});

	return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function getPresignedGetUrl(key: string) {
	const command = new GetObjectCommand({
		Bucket: S3_BUCKET,
		Key: key,
	});

	return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
