/**
 * Password Hashing with Argon2
 *
 * Uses Argon2id, the winner of the Password Hashing Competition.
 * Provides strong protection even if the database is compromised.
 */

import * as argon2 from "argon2";

/**
 * Hash a password using Argon2id.
 *
 * @param password - The plaintext password to hash
 * @returns The hashed password string (starts with $argon2id$)
 */
export async function hashPassword(password: string): Promise<string> {
	return argon2.hash(password, {
		type: argon2.argon2id,
		memoryCost: 65536, // 64 MB
		timeCost: 3,
		parallelism: 4,
	});
}

/**
 * Verify a password against a hash.
 *
 * @param hash - The stored password hash
 * @param password - The plaintext password to verify
 * @returns True if the password matches
 */
export async function verifyPassword(
	hash: string,
	password: string,
): Promise<boolean> {
	try {
		return await argon2.verify(hash, password);
	} catch {
		return false;
	}
}
