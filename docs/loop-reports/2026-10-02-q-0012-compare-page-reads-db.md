# Loop Report: q-0012 Compare page reads real models

- **Item**: `q-0012` - Compare page reads real models — `/compare` renders a hardcoded 3-entry SAMPLE_MODELS array and never queries the DB; replace it with a server-side select of models joined to providers (same shape as `/models` index). The `?a=provider/slug&b=provider/slug` picker resolves against DB rows — unknown slugs show the picker with an explanatory note, valid pairs show the side-by-side table (context window, $/1M in/out, modalities, availability status, last snapshot date). Preset links may stay but must reference real seeded slugs.
- **Date**: 2026-10-02
- **Branch**: `modelright/q-0012-compare-page-reads-db`

## Changes
- Updated `src/app/compare/page.tsx` to query the database using Drizzle (`models` joined to `providers`).
- Removed `SAMPLE_MODELS` hardcoded array.
- Displayed DB model properties including modalities, availability status (with color indicator dot), and last snapshot date.
- Formatted picker and preset comparison links using real database rows.
- Updated `QUEUE.md` marking `q-0012` as completed with branch `modelright/q-0012-compare-page-reads-db`.

## Verification
- Code structure follows Next.js App Router patterns used in `/models/page.tsx` and `/models/[provider]/[slug]/page.tsx`.
- CI will verify TypeScript and Next.js build.
