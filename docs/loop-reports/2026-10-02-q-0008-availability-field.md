# Loop Report: q-0008 Availability field

**Date:** 2026-10-02  
**Task ID:** q-0008  
**Acceptance Line:** `Availability field — models table gains last_seen_ok/last_seen_at/status derived from snapshots; index table shows a status dot (ok/degraded/unknown)`  
**Branch:** `modelright/q-0008-availability-field`

## What Changed and Why
1. **Database Schema (`src/db/schema.ts`)**:
   - Added `lastSeenOk` (`last_seen_ok` timestamp), `lastSeenAt` (`last_seen_at` timestamp), and `status` (`status` text, default `'unknown'`) fields to `models` table definition.
2. **Migrations (`drizzle/0001_availability_fields.sql`, `drizzle/meta/`)**:
   - Added migration `0001_availability_fields.sql` adding columns `last_seen_ok`, `last_seen_at`, and `status`. Updated `_journal.json` and added `0001_snapshot.json`.
3. **Ingest API (`src/app/api/ingest/route.ts`)**:
   - Updated upsert logic so upon ingesting model snapshots, `lastSeenAt`, `lastSeenOk` (if availability is `'available'` or `'ok'`), and `status` (`'ok'`, `'degraded'`, or `'unknown'`) are updated on the corresponding `models` record.
4. **Models Index Page (`src/app/models/page.tsx`)**:
   - Updated the query to select `models.status` and added a visual status dot in the table (green `#10b981` for `ok`, amber `#f59e0b` for `degraded`, gray `#9ca3af` for `unknown`).
5. **QUEUE.md**:
   - Ticked `q-0008` and noted branch `modelright/q-0008-availability-field`.

## Verification
- Pre-verified locally via `typecheck-branch` and `build-branch` commands (both succeeded with exit code 0).
