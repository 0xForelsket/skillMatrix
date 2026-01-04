import { addMonths } from "date-fns";

/**
 * Calculate when a certification expires based on when it was achieved
 * and the validity period of the skill.
 *
 * @param achievedAt Date the skill was achieved
 * @param validityMonths Months the skill is valid for (null/undefined = forever)
 * @returns Date of expiration, or null if it never expires
 */
export function calculateExpiresAt(
	achievedAt: Date,
	validityMonths: number | null | undefined,
): Date | null {
	if (!validityMonths || validityMonths <= 0) {
		return null;
	}

	return addMonths(achievedAt, validityMonths);
}

/**
 * Check if a certification is currently active (not expired).
 */
export function isCertificationActive(
	expiresAt: Date | null | undefined,
	referenceDate: Date = new Date(),
): boolean {
	if (!expiresAt) return true; // Never expires
	return expiresAt > referenceDate;
}

/**
 * Check if a certification is expiring soon (e.g. within 30 days).
 */
export function isExpiringSoon(
	expiresAt: Date | null | undefined,
	daysThreshold: number = 30,
	referenceDate: Date = new Date(),
): boolean {
	if (!expiresAt) return false;

	// If already expired, it's not "expiring soon", it's expired.
	if (expiresAt <= referenceDate) return false;

	const thresholdDate = new Date(referenceDate);
	thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

	return expiresAt <= thresholdDate;
}
