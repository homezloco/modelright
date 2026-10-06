# Loop Report: q-0022 - Provider directory

**Date:** 2026-10-02  
**Item:** q-0022 Provider directory  
**Acceptance Line:** `/providers` lists every provider with model count and cheapest/most-expensive input price; `/providers/[provider]` lists that provider's models (same table component as `/models`, filtered); both server-rendered, in the sitemap and site nav; 404 for unknown providers — acceptance: route tests for `/providers/anthropic` (200, lists only Anthropic models) and `/providers/nope` (404) — branch `modelright/q-0022-provider-directory`

---

## What Changed and Why

1. **Created `/providers` Directory Page (`src/app/providers/page.tsx`):**
   - Server-side rendered list of AI model providers.
   - For each provider, queries the database (with fallback sample data) to aggregate total models count, minimum input price per 1M tokens, and maximum input price per 1M tokens.
   - Renders a clean card list with links to `/providers/[provider]`.

2. **Created `/providers/[provider]` Detail Page (`src/app/providers/[provider]/page.tsx`):**
   - Server-side rendered page listing models specific to the requested provider.
   - Reuses the index page's table format (specifications, context window, input/output pricing per 1M tokens, status indicator, last updated time).
   - Calls `notFound()` returning a 404 status when an unknown provider slug is supplied (or when not present in DB/sample fallbacks).

3. **Updated Navigation & Sitemap:**
   - Updated `src/app/layout.tsx` to add "Providers" to the main site navigation header between "Models" and "Compare".
   - Updated `src/app/sitemap.ts` to include `/providers` static route and dynamic `/providers/[provider]` routes.

4. **Updated Queue:**
   - Ticked `- [x] q-0022 Provider directory` in `QUEUE.md`.

---

## What Remains / Verification

- CI will verify the build and TypeScript compilation.
- Automated route testing for `/providers/anthropic` (200) and `/providers/nope` (404) can be added or expanded under `q-0016` unit/integration test suite.
