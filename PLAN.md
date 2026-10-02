# Plan

## Now

**modelright.dev helps developers pick the right AI model for a job** — the
current price, context window, modalities and availability of every model
you can call through an API, kept fresh automatically, with the tools to
compare them and estimate what a workload will cost.

Who it's for: developers and teams choosing (or re-choosing) a model —
"what's the cheapest model with 200k context and vision?", "what would
GPT vs Claude cost at 2M tokens a day?", "did anything get cheaper this
week?". Also agents: everything is readable as JSON and llms.txt.

### Principles

1. **Real data only.** Every row comes from a source sync, never invented.
   Seed fixtures exist for local dev only. A page with no data says so.
2. **Freshness is visible.** Show when data last synced, and when each
   model's price last changed. Stale data is a bug.
3. **Price history is the moat.** `model_snapshots` records every change;
   charts, a changes feed and alerts all read from it.
4. **Answer the decision, not just the table.** Calculators, filters and
   task presets turn the registry into "use this one".
5. **Credit sources.** OpenRouter's public catalog is the primary source;
   benchmark data credits its origin (e.g. Artificial Analysis via
   LiveGraph Model Radar).
6. **Fast and cheap to run.** Server-rendered pages, no client data
   fetching for core views, no paid APIs.

### Roadmap (QUEUE.md is the source of truth for order)

1. **Real data** — OpenRouter catalog sync (hourly), retire seed data,
   freshness indicators, ingest rate limiting.
2. **Change over time** — provider pages, price history charts, a
   /changes feed with RSS.
3. **Choose the right model** — cost calculator, compare up to 4,
   find-a-model filters, task presets (/pick).
4. **For developers and search** — public JSON API, "A vs B" compare
   pages, benchmarks from LiveGraph Model Radar.

### Ops

- The hourly sync is fired by a LiveGraph schedule (a deterministic
  http step — no model, $0) calling `POST /api/cron/sync` with the
  `x-cron-secret` header; `CRON_SECRET` lives in Railway's env.
