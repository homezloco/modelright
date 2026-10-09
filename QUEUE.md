# Queue

The improvement loop works "## Open" top to bottom — one item per round,
ticked in that item's own PR. Acceptance lines are the contract.

## Open

- [ ] q-0044 Optimize database index lookups — the ingest and search queries frequently scan model_snapshots and models; analyze pg_stat_statements to identify missing covering indexes (provider-slug, snapshot captured_at); create indexes as needed via migration — (reliability) — acceptance: explain query plan shows index scan vs seq scan on a populated registry; migration committed — branch modelright/q-0044-db-optimizations
- [ ] q-0045 Fix navigation active-state styling — the header nav links (Models, Compare, etc.) don't visually reflect the current route; add a `usePathname()`-based check to apply the 'text-sky-400' class instead of the default 'text-slate-300' to the link matching the current base segment — (ux) — acceptance: visual verification or unit test that link elements with matching hrefs receive the active class — branch modelright/q-0045-nav-active-style
- [ ] q-0046 Add Open Graph images — generate dynamic OG images for /models/[provider]/[slug] and /compare/[a]-vs-[b] using a server-side route (e.g. using @resvg/resvg-js or similar, styled for branding) — (ux) — acceptance: /api/og/[slug] returns 200 with an image/png content type; meta tags on detail pages point to the correct OG route — branch modelright/q-0046-og-images

## Done (last 20)

- [x] q-0043 Rankings & curated picks — /rankings leaderboard: tables ranked by AA benchmark dimensions (intelligence index, coding index, output tok/s, TTFT) extracted from model_snapshots.rawPayload (reuse the aa-benchmarks extraction), joined to live pricing so each row shows rank, model, score, and $/1M in/out — the "smartest per dollar" context pure leaderboards lack; only models carrying benchmark data rank; graceful empty state when no AA data exists. Extend the /pick coding task to prefer AA coding index when present (fall back to the existing provider-count rule); nav + sitemap + llms.txt gain the route — (ux) — acceptance: unit tests for ranking derivation (ordering, missing/partial benchmark rows excluded, price join, empty input) and the coding-pick benchmark preference; route test renders tables and empty state — branch modelright/q-0043-rankings-curation
- [x] q-0001 Add package-lock.json
- [x] q-0002 Ingest schema — drizzle tables `providers`, `models` (provider fk, slug, context_window, input/output price per 1M, modality tags, timestamps), `ingest_log` (source, payload count, status, created_at), `model_snapshots` (model fk, captured_at, availability, price-points, rawPayload) — (reliability) — acceptance: migration file exists, schema matches description — branch modelright/q-0002-ingest-schema
- [x] q-0003 Cron handler — `POST /api/cron/sync` endpoint that fetches the OpenRouter JSON, upserts providers/models/snapshots, and logs to `ingest_log` — (reliability) — acceptance: manual trigger populates database; ingest_log entry created — branch modelright/q-0003-cron-handler
- [x] q-0004 Registry view — list of all models with search and filter by provider — (ux) — acceptance: /models route renders list, search filters results — branch modelright/q-0004-registry-view
- [x] q-0005 Price history — model detail page displays a chart of price changes over time from `model_snapshots` — (reliability) — acceptance: chart renders on /models/[provider]/[slug] using snapshots — branch modelright/q-0005-price-history
- [x] q-0006 Refresh rate limit — add cache-control/rate-limiting logic to ingest so it only runs when OpenRouter data changes (ETag or timestamp diff) — (reliability) — acceptance: subsequent cron hits skip re-ingestion if data is identical — branch modelright/q-0006-refresh-rate-limit
- [x] q-0007 Compare view — /compare/[a]-vs-[b] side-by-side spec comparison (context, prices, modalities) — (ux) — acceptance: layout shows both models clearly — branch modelright/q-0007-compare-view
- [x] q-0008 Task presets (/pick) — calculators to pick a model for a specific workload (e.g. "coder", "writer") — (ux) — acceptance: /pick page allows selecting a task type and shows recommendation — branch modelright/q-0008-pick-task
- [x] q-0009 Public API — /api/models, /api/models/[provider]/[slug] endpoints serving JSON — (reliability) — acceptance: endpoints return valid registry data — branch modelright/q-0009-public-api
- [x] q-0010 Sitemap — generate `sitemap.xml` for all model pages — (ux) — acceptance: /sitemap.xml lists all model routes — branch modelright/q-0010-sitemap
- [x] q-0011 llms.txt — provide `/llms.txt` and `/llms-full.txt` (a registry summary) for agents — (ux) — acceptance: text files available and content reflects current models — branch modelright/q-0011-llmstxt
- [x] q-0012 Benchmarks — ingest AA model data and display in detail pages — (reliability) — acceptance: AA metrics visible on model pages — branch modelright/q-0012-benchmarks
- [x] q-0013 Changes feed — /changes page showing recent model additions/price updates with RSS — (ux) — acceptance: feed shows latest snapshot events — branch modelright/q-0013-changes-feed
- [x] q-0014 Model Radar credits — acknowledge sources in footer — (ux) — acceptance: credit links present — branch modelright/q-0014-credits
- [x] q-0015 UI responsiveness — fix mobile layout issues — (ux) — acceptance: tables scale on small screens — branch modelright/q-0015-responsive-ui
- [x] q-0016 Error boundaries — add global error UI for failed page loads — (reliability) — acceptance: custom error page renders on failures — branch modelright/q-0016-error-boundaries
- [x] q-0019 Dark mode — add theme toggle to header — (ux) — acceptance: theme switches, persists in localstorage — branch modelright/q-0019-dark-mode
- [x] q-0020 Favicon/branding — set site icons — (ux) — acceptance: site shows favicon — branch modelright/q-0020-branding
- [x] q-0021 IndexNow — add IndexNow integration to trigger on sync events — (reliability) — acceptance: bot receives notification on change — branch modelright/q-0021-indexnow
