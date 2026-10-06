# Loop Report: q-0020 Sync endpoint

## Item
- ID: `q-0020`
- Acceptance: extract the upsert logic from `src/app/api/ingest/route.ts` into `src/lib/ingest.ts` (shared, behaviour unchanged) and add `POST /api/cron/sync`: requires header `x-cron-secret` equal to env `CRON_SECRET` (timing-safe; 401 otherwise, 503 if `CRON_SECRET` unset), runs `fetchOpenRouterCatalog` → `normalizeOpenRouter` → the shared upsert with source "openrouter", writes an `ingest_log` row, and marks models from source "openrouter" that are no longer in the catalog status "removed" (never deletes rows). Returns `{fetched, upserted, removed}`. Document `CRON_SECRET` in `.env.example`.

## Changes Made
- Created `src/lib/ingest.ts` with shared `processIngestPayload`, `syncOpenRouterCatalog`, `verifyBearerToken`, and `verifyCronSecret` helpers.
- Refactored `src/app/api/ingest/route.ts` to use `processIngestPayload` and `verifyBearerToken` from `src/lib/ingest.ts`.
- Created `src/app/api/cron/sync/route.ts` implementing `POST /api/cron/sync` with timing-safe `x-cron-secret` authorization (returning 503 when unset, 401 when invalid, and `{fetched, upserted, removed}` on success).
- Updated `.env.example` to document `CRON_SECRET` and `INGEST_TOKEN`.
- Ticked item `q-0020` in `QUEUE.md`.

## What Could Not Be Verified
- Live execution of `/api/cron/sync` against live PostgreSQL or OpenRouter endpoints (verified via typechecks and standard route contract structure).

## What Remains
- Test suite additions covering route handlers (in subsequent item q-0016 or future route tests).
