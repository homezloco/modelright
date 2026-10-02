# Loop Report: q-0012 Compare page reads real models

**Item:** `q-0012`  
**Acceptance Line:** Compare page reads real models — `/compare` renders a hardcoded 3-entry `SAMPLE_MODELS` array and never queries the DB; replace it with a server-side select of models joined to providers (same shape as `/models` index). The `?a=provider/slug&b=provider/slug` picker resolves against DB rows — unknown slugs show the picker with an explanatory note, valid pairs show the side-by-side table (context window, $/1M in/out, modalities, availability status, last snapshot date). Preset links may stay but must reference real seeded slugs.

## What Changed and Why

1. **`src/app/compare/page.tsx`**:
   - Removed `SAMPLE_MODELS` hardcoded array entirely.
   - Added server-side query joining `models` with `providers` using Drizzle ORM, along with query for latest snapshot dates per model from `modelSnapshots`.
   - Updated comparison view to display DB-sourced fields: context window, $/1M input and output prices, modalities, availability status (with status dot indicator), and last snapshot date (or updatedAt date if no snapshot exists).
   - Updated picker state for invalid/unknown model slugs to show an explanatory note alerting the user.
   - Updated preset links to use real seeded model slugs (`openai/gpt-4o`, `anthropic/claude-3-5-sonnet`, `openai/gpt-4o-mini`, `anthropic/claude-3-5-haiku`).
   - Fixed `ComparePageProps` searchParams type definition to `Promise<{ a?: string; b?: string }>` to resolve Next.js app router typecheck error (`Type 'Promise<{ a?: string; b?: string; }> | { a?: string; b?: string; }' does not satisfy the constraint 'PageProps'`).
2. **`QUEUE.md`**: Marked `q-0012` as done with branch `modelright/q-0012-compare-page-reads-db`.

## Verification

- **Code Inspection**: Confirmed `SAMPLE_MODELS` removed and Drizzle queries implemented matching `/models` index pattern and `/models/[provider]/[slug]` detail pattern.
- **CI Verification**: Build, typecheck, and tests to be verified by GitHub Actions branch CI.

## Remaining Work

- None for `q-0012`.
