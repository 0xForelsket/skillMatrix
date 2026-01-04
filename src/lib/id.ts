import { uuidv7 } from "uuidv7";

/**
 * Generate a UUIDv7 identifier.
 *
 * UUIDv7 is a time-ordered UUID that:
 * - Sorts chronologically (newer IDs sort after older ones)
 * - Is globally unique without coordination
 * - Contains a Unix timestamp in the high bits
 *
 * Use this for all primary keys in the database.
 *
 * @returns A new UUIDv7 string
 */
export function generateId(): string {
	return uuidv7();
}

/**
 * Extract the timestamp from a UUIDv7.
 *
 * @param id - A UUIDv7 string
 * @returns The Date when the ID was generated
 */
export function getIdTimestamp(id: string): Date {
	// UUIDv7 has the timestamp in the first 48 bits
	const hex = id.replace(/-/g, "").slice(0, 12);
	const timestamp = Number.parseInt(hex, 16);
	return new Date(timestamp);
}
