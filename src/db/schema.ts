import { pgTable, uuid, text, integer, numeric, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const providers = pgTable('providers', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const models = pgTable('models', {
  id: uuid('id').defaultRandom().primaryKey(),
  providerId: uuid('provider_id').notNull().references(() => providers.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  contextWindow: integer('context_window').notNull(),
  inputPricePerM: numeric('input_price_per_m', { precision: 12, scale: 6 }).notNull(),
  outputPricePerM: numeric('output_price_per_m', { precision: 12, scale: 6 }).notNull(),
  modalityTags: jsonb('modality_tags').$type<string[]>().default([]).notNull(),
  lastSeenOk: timestamp('last_seen_ok'),
  lastSeenAt: timestamp('last_seen_at'),
  status: text('status').default('unknown').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    providerSlugIdx: uniqueIndex('models_provider_slug_idx').on(table.providerId, table.slug),
  };
});

export const ingestLog = pgTable('ingest_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  source: text('source').notNull(),
  payloadCount: integer('payload_count').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const modelSnapshots = pgTable('model_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  modelId: uuid('model_id').notNull().references(() => models.id, { onDelete: 'cascade' }),
  capturedAt: timestamp('captured_at').defaultNow().notNull(),
  availability: text('availability').notNull(),
  inputPricePerM: numeric('input_price_per_m', { precision: 12, scale: 6 }).notNull(),
  outputPricePerM: numeric('output_price_per_m', { precision: 12, scale: 6 }).notNull(),
  rawPayload: jsonb('raw_payload'),
});
