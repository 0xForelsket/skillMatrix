/**
 * Database Query Helpers
 *
 * Reusable filters and utilities for common query patterns.
 */

import { isNull, type SQL } from "drizzle-orm";

/**
 * Filter for active (non-deleted) records.
 *
 * Use with Drizzle queries:
 * @example
 * db.query.employees.findMany({ where: withActive(employees) })
 *
 * @example
 * db.select().from(employees).where(withActive(employees))
 */
export function withActive<T extends { deletedAt: unknown }>(
	table: T,
): SQL<unknown> {
	return isNull(table.deletedAt);
}

/**
 * Alias for withActive - semantically clearer in some contexts.
 *
 * @example
 * db.select().from(skills).where(notDeleted(skills))
 */
export const notDeleted = withActive;
