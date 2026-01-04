/**
 * Badge Token Generation
 *
 * Generates secure, URL-safe tokens for employee badge QR codes.
 * These tokens are embedded in URLs like: /b/qR7xK9mN...
 */

import { nanoid } from "nanoid";

/**
 * Generate a secure badge token.
 *
 * Uses nanoid to create a 21-character URL-safe string.
 * This is embedded in QR codes for the public skill viewer.
 *
 * @returns A 21-character URL-safe token
 */
export function generateBadgeToken(): string {
	return nanoid(21);
}
