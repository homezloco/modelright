import { pgTable, uuid, text, integer, numeric, jsonb, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';

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

// Cookieless analytics (q-0042). Visitors are a daily-rotating
// sha256(ip+ua+date+salt) hash — no cookies, and the raw IP is never
// stored. `suspect`/`headless` are advisory flags kept out of headline
// counts; NULL suspect means "unevaluated" (no geo table here yet).
export const pageViews = pgTable('page_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  path: text('path'),
  referrer: text('referrer'),
  refDomain: text('ref_domain'),
  visitor: text('visitor'),
  device: text('device'),
  browser: text('browser'),
  os: text('os'),
  lang: text('lang'),
  screen: text('screen'),
  viewport: text('viewport'),
  tz: text('tz'),
  display: text('display'),
  country: text('country'),
  host: text('host'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  suspect: integer('suspect'),
  headless: integer('headless'),
}, (table) => ({
  tsIdx: index('page_views_ts_idx').on(table.ts),
  pathIdx: index('page_views_path_idx').on(table.path),
  visitorIdx: index('page_views_visitor_idx').on(table.visitor),
}));

// Server-side hits from known crawlers/AI bots — they never run the JS
// beacon, so middleware records them via /api/bot-hit instead.
export const botHits = pgTable('bot_hits', {
  id: uuid('id').defaultRandom().primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  path: text('path'),
  botName: text('bot_name'),
  ua: text('ua'),
  host: text('host'),
}, (table) => ({
  tsIdx: index('bot_hits_ts_idx').on(table.ts),
  botNameIdx: index('bot_hits_bot_name_idx').on(table.botName),
}));

// JSON-RPC calls against /api/mcp, counted best-effort in the route's
// metered wrapper. `tool` is the tools/call name; NULL for other methods.
export const mcpCalls = pgTable('mcp_calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  ts: timestamp('ts').defaultNow().notNull(),
  method: text('method'),
  tool: text('tool'),
  visitorHash: text('visitor_hash'),
  ok: boolean('ok'),
}, (table) => ({
  tsIdx: index('mcp_calls_ts_idx').on(table.ts),
  toolIdx: index('mcp_calls_tool_idx').on(table.tool),
}));
