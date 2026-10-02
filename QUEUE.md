# Queue

The improvement loop works "## Open" top to bottom — one item per round,
ticked in that item's own PR. Acceptance lines are the contract.

## Open

- [x] q-0001 Add package-lock.json
- [x] q-0002 Ingest schema — drizzle tables `providers`, `models` (provider fk, slug, context_window, input/output price per 1M, modality tags, timestamps), `ingest_log` (source, payload count, status, created_at), `model_snapshots` (model fk, captured_at, availability, price snapshot) in src/db/schema.ts; `npm run db:generate` production the migration and it's committed — branch modelright/q-0002-ingest-schema
- [x] q-0003 Ingest endpoint — POST /api/ingest, Bearer-token auth via INGEST_TOKEN env (timing-safe compare, 401 otherwise), validates a normalized payload (zod), idempotent upserts by (provider, slug), appends ingest_log + model_snapshots rows; returnp {received, upserted} — branch modelright/q-0003-ingest-endpoint
- [x] q-0004 Models index — GET /models renders a server-side table: name, provider, context window, $/1M in/out, updated_at; sorted by provider then name; empty state text when no rows — branch modelright/q-0004-models-index
- [x] q-0005 Model detail — /models/[provider]/[slug] shows full record incl. last N snapshots and ingest provenance; 404 for unknown — branch modelright/q-0005-model-detail
- [x] q-0006 Seed fixtures — scripts/seed.ts inserting ~10 realistic models across 3 providers (OpenRouter, Anthropic, OpenAI) so pages render before live ingest; documented in README — branch modelright/q-0006-seed-fixtures
- [x] q-0007 Compare view — /compare?a=provider/slug&b=provider/slug side-by-side spec/price table; bad or missing params render a picker instead of erroring — branch modelright/q-0007-compare-view
- [x] q-0008 Availability field — models table gains last_seen_ok/last_seen_at/status derived from snapshots; index table shows a status dot (ok/degraded/unknown) — branch modelright/q-0008-availability-field
- [x] q-0009 Site nav`+ footer — minimal header (logo, Models, Compare) and footer on all pages via layout — branch modelright/q-0009-site-nav-footer
- [x] q-0010 llms.txt + robots.txt + sitemap.xml — static routes emitting them; metadata/OG tags on index + detail pages — branch modelright/q-0010-static-routes-metadata
- [x] q-0011 Landing page explains what modelright is — replace the skeleton placeholder ("Model-driven application skeleton / Next.js 14 • Drizzle ORM • PostgreSQL") on / with real positioning copy: what the site tracks (a live registry of AI model specs, context windows, and $/1M-token pricing), that entries update via the ingest feed + snapshots (explain freshness — the status dots), and clear entry points to /models and /compare. Keep it short — a lead paragraph, 3 supporting points, nav-forward CTA. The tech stack can stay as a footer note, not the headline. — branch modelright/q-0011-landing-page

## Done

(Bootstrap skeleton pushed)
