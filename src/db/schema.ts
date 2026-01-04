/**
 * Caliber Database Schema
 *
 * This file defines all database tables using Drizzle ORM.
 * See docs/schema.md for the full ERD and documentation.
 */

import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { generateId } from "@/lib/id";

// =============================================================================
// Helper: Common columns for all tables
// =============================================================================

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

// =============================================================================
// Sites - Physical locations/plants
// =============================================================================

export const sites = pgTable("sites", {
	id: uuid("id").primaryKey().$defaultFn(generateId),
	code: text("code").notNull().unique(), // e.g., "ATX-01"
	name: text("name").notNull(), // e.g., "Austin Plant"
	...timestamps,
	...softDelete,
});

// Export types for use in application code
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
