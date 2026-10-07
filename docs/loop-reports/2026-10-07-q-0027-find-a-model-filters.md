# Loop Report: q-0027 Find-a-model filters

**Item ID**: q-0027  
**Date**: 2026-10-07  
**Branch**: `modelright/q-0027-find-a-model-filters`  

## Acceptance Line
Find-a-model filters — /models gains filters, combinable with the existing provider/sort/page params: minimum context window, maximum input $/1M, modality (vision, audio, image output), free only, and hide removed models (default on); all in URL params; empty results show "No models match — widen a filter" with a reset link — acceptance: query-builder unit tests for each filter and a combination — branch modelright/q-0027-find-a-model-filters

## What Changed
- Created `src/lib/filters.ts` with pure query-builder helpers:
  - `parseModelFilters`: parses URL search parameters (`provider`, `minContext`, `maxInputPrice`, `modality`, `freeOnly`, `hideRemoved`).
  - Defaults `hideRemoved` to `true` unless explicitly overridden as `'false'` or `'0'`.
  - `buildModelWhereConditions`: constructs Drizzle SQL conditions for provider, context window minimum (`gte`), input price max (`lte`), free only (`0`), modality (`modality_tags @> jsonb_build_array(...)`), and status != 'removed'.
  - `buildModelWhereClause`: combines conditions with `and(...)`.
- Updated `src/app/models/page.tsx` UI & server component:
  - Added filter form controls for provider, min context window, max input price $/1M, modality dropdown (vision, audio, image output), free only checkbox, and hide removed checkbox.
  - Form preserves active parameters across sorting, pagination, and filter changes.
  - Rendered empty state message `"No models match — widen a filter"` with a reset link when filter results yield 0 rows.
  - Maintained Next.js 15 async `searchParams` compatibility via `Promise.resolve(searchParams)`.
- Added unit tests in `tests/filters.test.ts` covering URL param parsing and query-builder SQL condition generation for individual filters and combinations.

## What Could Not Be Verified
- Local command execution is unavailable; full TypeScript compilation (`npm run typecheck`), Next build (`npm run build`), and test suite (`npm test`) rely on GitHub Actions CI.

## Remaining Gaps / Next Steps
- None.
