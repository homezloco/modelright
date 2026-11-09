# Modelright is live: a searchable, hourly-synced catalog of 450+ LLMs with real pricing and context limits

**TL;DR** — `modelright.dev` is now the fastest way to compare every model OpenRouter serves (450+ across 80+ providers) with live per-1M-token pricing, context windows, and Artificial Analysis benchmarks — all queryable via UI, public API, MCP, or `llms.txt`.

---

## Why this exists

Every production LLM decision starts the same way: open 10 tabs, copy pricing tables into a spreadsheet, realize half the context-window claims are stale, and still not know which model actually fits the token budget *and* the latency SLA.

Modelright removes that loop.

| Surface | What you get | Update cadence |
|---------|--------------|----------------|
| `/models` | Filterable table: provider, price ceiling ($/1M in/out), context floor, modality, free-tier flag | Hourly (OpenRouter sync) |
| `/models/[provider]/[slug]` | Specs + price-history chart + cost calculator + AA benchmark card | Hourly |
| `/compare` (up to 4) | Side-by-side with cheapest-highlighting; SEO pair pages at `/compare/a-vs-b` | Hourly |
| `/pick/{chat,coding,long-context,vision,cheap-bulk}` | Ranked by an explicit, visible rule per task | Hourly |
| `/changes` + RSS | Every price change, status flip, add/remove since last sync | Hourly |
| `GET /api/v1/models` | Same filters as UI, JSON, OpenAPI at `/openapi.json` | Hourly |
| MCP (`/api/mcp`) | 6 read tools: `search_models`, `get_model`, `list_providers`, `compare_models`, `get_changes`, `get_ingest_status` | Hourly |
| `llms.txt` / `agents.txt` / A2A card | Machine-readable catalog for agent tooling | Hourly |

---

## Data sources & freshness

- **OpenRouter catalog** — 450+ models, 80+ providers, hourly pull. Models marked `removed` (not deleted) when a provider drops them.
- **Artificial Analysis** — Benchmarks (MMLU, GPQA, HumanEval, etc.), tokens/sec, TTFT, latency P50/P95. Enriched on every model where AA has a match.
- **Append-only price snapshots** — Every ingest writes a row; `/changes` and price-history charts are derived, not reconstructed.

> **No manual curation.** If a provider publishes a new model or changes pricing on OpenRouter, it appears on modelright.dev within the hour. If AA publishes a new benchmark, the card updates on the next enrich pass.

---

## Quick-start for the two most common workflows

### 1. "I need the cheapest model that handles 128k context for batch classification"

```bash
curl "https://modelright.dev/api/v1/models?context_min=131072&price_max_out=0.50&modality=text"
# Returns JSON array sorted by output $/1M asc
```

Or in the UI: `/models?context_min=131072&price_max_out=0.50` → sort by **Output $/1M**.

### 2. "Compare GPT-4o vs Claude 3.5 Sonnet vs Gemini 1.5 Pro for a coding agent"

```bash
curl "https://modelright.dev/api/v1/models?provider=openai&slug=gpt-4o"
curl "https://modelright.dev/api/v1/models?provider=anthropic&slug=claude-3-5-sonnet"
curl "https://modelright.dev/api/v1/models?provider=google&slug=gemini-1.5-pro"
```

Or open `/compare/openai-gpt-4o-vs-anthropic-claude-3-5-sonnet-vs-google-gemini-1.5-pro` — cheapest input/output highlighted automatically.

---

## MCP for agents (Cursor, Claude Code, custom)

```json
{
  "mcpServers": {
    "modelright": {
      "url": "https://modelright.dev/api/mcp"
    }
  }
}
```

Tools exposed:

| Tool | Use case |
|------|----------|
| `search_models` | Filter by price, context, modality, provider, free-tier |
| `get_model` | Full spec + pricing + benchmarks + price history |
| `list_providers` | All 80+ providers with model counts |
| `compare_models` | Up to 4 models, returns normalized comparison table |
| `get_changes` | Recent price drops, new models, deprecations |
| `get_ingest_status` | Last sync timestamp, model count, error state |

---

## What "live" actually means

| Metric | Value |
|--------|-------|
| Models in catalog | 450+ |
| Providers | 80+ |
| Sync frequency | Hourly (cron at `:00` UTC) |
| Ingest latency (p95) | <8 s for full catalog |
| Price snapshot rows | 1 per model per sync (append-only) |
| Benchmark coverage (AA) | ~60% of catalog |
| Uptime target (Railway) | 99.9% |

---

## Roadmap (next 4 weeks)

1. **Provider webhooks** — Push from OpenRouter/AA instead of pull (sub-minute freshness)
2. **Fine-tune metadata** — Base model, license, training cutoff, quantization variants
3. **Team workspaces** — Saved comparisons, alerts on price drops, export to CSV/Notion
4. **Cost simulator** — "What does 1M requests at 2k avg context cost across my shortlist?"

---

## Try it now

- **Web**: https://modelright.dev
- **API**: https://modelright.dev/api/v1/models
- **MCP**: https://modelright.dev/api/mcp
- **OpenAPI**: https://modelright.dev/openapi.json
- **Changes feed**: https://modelright.dev/changes (RSS at `/changes.rss`)
- **Agent surfaces**: `/llms.txt`, `/agents.txt`, `/.well-known/agent-card.json`

---

## One-liner for directories / listings

> **Modelright** — Live registry of AI model specs, context windows, and per-1M-token pricing across 80+ providers. Hourly-synced from OpenRouter, enriched with Artificial Analysis benchmarks. UI + API + MCP + `llms.txt`. Free.

---

## 50-char tagline

Live LLM catalog: specs, pricing, benchmarks — hourly.

---

## 200-char description

Modelright.dev is a searchable, hourly-updated catalog of 450+ LLMs from 80+ providers via OpenRouter. Compare models side-by-side with live per-1M-token pricing, context windows, and Artificial Analysis benchmarks. Accessible via web UI, REST API, MCP server, and `llms.txt` for agent tooling. No signup, no tracking cookies.

---

*Built by Homezloco. MIT licensed. Questions? Open an issue or ping @homezloco on X.*