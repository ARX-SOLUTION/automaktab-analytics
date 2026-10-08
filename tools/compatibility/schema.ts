import { pgTable, text } from 'drizzle-orm/pg-core';
export const probe = pgTable('synthetic_compatibility_probe', { id: text('id').primaryKey() });
