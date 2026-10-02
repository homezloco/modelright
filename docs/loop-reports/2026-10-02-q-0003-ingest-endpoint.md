# Loop Report: q-0003 Ingest endpoint

- Item: q-0003 Ingest endpoint — POST /api/ingest, Bearer-token auth via INGEST_TOKEN env (timing-safe compare, 401 otherwise), validates a normalized payload (zod), idempotent upserts by (provider, slug), appends ingest_log + model_snapshots rows; returns {received, upserted}
- Branch: modelright/q-0003-ingest-endpoint

## What Changed
1. Added `zod` dependency to `package.json`.
2. Created `src/app/api/ingest/route.ts` implementing `POST /api/ingest`:
   - Checks `Authorization: Bearer <INGEST_TOKEN>` header using Node's `crypto.timingSafeEqual` for timing-safety. Returns `401` if token is invalid or missing.
   - Validates JSON payload body with a Zod schema defining `source` and `models` array (provider, slug, name, contextWindow, inputPricePerM, outputPricePerM, modalityTags, availability). Returns `400` on validation error or bad JSON.
   - Idempotently upserts provider by `slug` and model by `(providerId, slug)`.
   - Appends a snapshot row to `model_snapshots` for each model payload item.
   - Appends a log row to `ingest_log` recording source, payload count, and status.
   - Returns `{ received, upserted }`.
3. Updated `QUEUE.md` marking `q-0003` as complete on `modelright/q-0003-ingest-endpoint`.

## Verification Note
- Remote host `refresh-lockfile` command was run to update `package-lock.json`.
- Typechecking / CI will verify endpoint compilation against Drizzle ORM schema and Next.js App Router types.
