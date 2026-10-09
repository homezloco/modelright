# Queue

The improvement loop works "## Open" top to bottom — one item per round,
ticked in that item's own PR. Acceptance lines are the contract.

## Open

- [ ] q-0044 Optimize database index lookups — the ingest and search queries frequently scan model_snapshots and models; analyze pg_stat_statements to identify missing covering indexes (provider-slug, snapshot captured_at); create indexes as needed via migration — (reliability) — acceptance: explain query plan shows index scan vs seq scan on a populated registry; migration committed — branch modelright/q-0044-db-optimizations
- [ ] q-0045 Fix navigation active-state styling — the header nav links (Models, Compare, etc.) don't visually reflect the current route; add a `usePathname()`-based check to apply the 'text-sky-400' class instead of the default 'text-slate-300' to the link matching the current base segment — (ux) — acceptance: visual verification or unit test that link elements with matching hrefs receive the active class — branch modelright/q-0045-nav-active-style
- [ ] q-0046 Add Open Graph images — generate dynamic OG images for /models/[provider]/[slug] and /compare/[a]-vs-[b] using a server-side route (e.g. using @resvg/resvg-js or similar, styled for branding) — (ux) — acceptance: /api/og/[slug] returns 200 with an image/png content type; meta tags on detail pages point to the correct OG route — branch modelright/q-0046-og-images

## Done (last 20)

- [x] q-0043 Rankings & curated picks — /rankings leaderboard: tables ranked by AA benchmark dimensions (intelligence index, coding index, output tok/s, TTFT) extracted from model_snapshots.rawPayload (reuse the aa-benchmarks extraction), joined to live pricing so each row shows rank, model, score, and $/1M in/out — the "smartest per dollar" context pure leaderboards lack; only models carrying benchmark data rank; graceful empty state when no AA data exists. Extend the /pick coding task to prefer AA coding index when present (fall back to the existing provider-count rule); nav + sitemap + llms.txt gain the route — (ux) — acceptance: unit tests for ranking derivation (ordering, missing/partial benchmark rows excluded, price join, empty input) and the coding-pick benchmark preference; route test renders tables and empty state — branch modelright/q-0043-rankings-curation
