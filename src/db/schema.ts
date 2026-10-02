import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Placeholder table proving the Drizzle wiring.
// The product loop owns the real schema.
export const examples = pgTable('examples', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
