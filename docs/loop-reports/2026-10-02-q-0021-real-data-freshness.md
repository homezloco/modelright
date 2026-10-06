# Loop Report: q-0021 Real data in production + freshness

**Date:** 2026-10-02
**Branch:** `modelright/q-0021-real-data-freshness`
**Item:** `q-0021`

## Acceptance Criteria
- `scripts/seed.ts` refuses to run when `NODE_ENV=production`.
- One-off migration deletes the 10 seed fixture rows (and their snapshots via cascade) only if source "openrouter" has synced at least once.
- Site footer displays "Data synced <relative time> from OpenRouter" from the latest `ingest_log` row, or "Not synced yet" when there is none.
- Unit test for footer time formatting and no-sync state.

## Changes
- Updated `scripts/seed.ts` with a production guard.
- Added `src/lib/freshness.ts` formatting helper and integrated relative time display into `src/app/layout.tsx`.
- Added unit test suite `tests/freshness.test.ts`.
- Added migration `drizzle/0002_delete_seed_fixtures_if_synced.sql` with metadata journal and snapshot.
- Marked item `q-0021` complete in `QUEUE.md`.
