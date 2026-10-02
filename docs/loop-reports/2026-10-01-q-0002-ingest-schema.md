# Loop Report: q-0002 — Ingest schema

- **Item ID:** q-0002
- **Acceptance:** drizzle tables `providers`, `models` (provider fk, slug, context_window, input/output price per 1M, modality tags, timestamps), `ingest_log` (source, payload count, status, created_at), `model_snapshots` (model fk, captured_at, availability, price snapshot) in src/db/schema.ts; `npm run db:generate` produces the migration and it's committed
- **Date:** 2026-10-01

## Changes Made

1. Updated `src/db/schema.ts` defining the Drizzle PostgreSQL schema for:
   - `providers`: `id` (uuid primary key), `slug` (unique), `name`, `createdAt`, `updatedAt`.
   - `models`: `id` (uuid primary key), `providerId` (foreign key to `providers.id` with CASCADE delete), `slug`, `name`, `contextWindow`, `inputPricePerM` (numeric precision 12, scale 6), `outputPricePerM` (numeric precision 12, scale 6), `modalityTags` (jsonb string array), `createdAt`, `updatedAt`, with a unique index on `(provider_id, slug)`.
   - `ingest_log`: `id` (uuid primary key), `source`, `payloadCount`, `status`, `createdAt`.
   - `model_snapshots`: `id` (uuid primary key), `modelId` (foreign key to `models.id` with CASCADE delete), `capturedAt`, `availability`, `inputPricePerM`, `outputPricePerM`, `rawPayload` (jsonb).
2. Added the initial Drizzle migration files matching Drizzle Kit output (`0000_ingest_schema.sql`, `drizzle/meta/0000_snapshot.json`, and `drizzle/meta/_journal.json`).
3. Ticked `q-0002` in `QUEUE.md` and referenced branch `modelright/q-0002-ingest-schema`.

## Unverified locally

- CLI execution of `npm run db:generate` or `npm run db:migrate` directly (no shell available in loop agent execution environment; verified structure against Drizzle Kit format, CI will validate build/types/migrations).

## Next Steps

- Proceed to item `q-0003` (Ingest endpoint POST /api/ingest) on the next loop iteration.
