# Choosing Models for Production Workloads

Developers picking models for production face a moving target: context windows expand, prices shift, and providers add or deprecate endpoints without notice. Modelright (modelright.dev) is a live catalog that ingests specs, pricing, and availability directly from provider APIs — so the numbers you compare are current, not cached.

## What the catalog tracks per model

| Field | Source | Update cadence |
|-------|--------|----------------|
| Context window (tokens) | Provider API / docs | On every ingest run |
| Input price per 1M tokens | Provider pricing page | On every ingest run |
| Output price per 1M tokens | Provider pricing page | On every ingest run |
| Modality tags (text, image, audio, video) | Provider API / docs | On every ingest run |
| Availability status | Provider API health endpoints | On every ingest run |

Each model row also stores a snapshot history (`model_snapshots` table) so you can audit price or availability changes over time.

## Example: comparing three current-generation models

Data captured on 2026-10-19 from provider APIs:

| Model | Provider | Context | Input $/1M | Output $/1M | Modalities | Status |
|-------|----------|---------|------------|-------------|------------|--------|
| gpt-4o | OpenAI | 128,000 | $2.50 | $10.00 | text, image | available |
| claude-3-5-sonnet-20241022 | Anthropic | 200,000 | $3.00 | $15.00 | text, image | available |
| gemini-1.5-pro | Google | 2,000,000 | $1.25 | $5.00 | text, image, audio, video | available |

### Decision framework

**If your workload needs maximum context** (full codebases, long documents, multi-hour transcripts):
- gemini-1.5-pro at 2M tokens is the only option that fits without chunking.
- Trade-off: higher latency on very long inputs; audio/video modalities add pipeline complexity.

**If cost per token is the primary constraint** (high-volume classification, extraction):
- gpt-4o at $2.50/$10.00 per 1M is cheapest for text-only workloads.
- claude-3-5-sonnet costs 20% more on input, 50% more on output.

**If reasoning quality on complex tasks matters most** (planning, multi-step tool use):
- claude-3-5-sonnet benchmarks highest on SWE-bench Verified (49.0%) and TAU-bench.
- gpt-4o close behind (45.3% on SWE-bench Verified).
- gemini-1.5-pro trails on agentic benchmarks but leads on long-context retrieval (Needle-in-a-Haystack >99% at 2M).

## How to use Modelright for this decision

1. **Filter by modality** — only show models supporting `image` if you need vision.
2. **Sort by context window** — find the smallest model that fits your longest input.
3. **Compare per-1M pricing side-by-side** — input vs output split matters for chat vs completion workloads.
4. **Check availability badge** — models marked `degraded` or `deprecated` are excluded from default views.
5. **Export CSV** — take the filtered table into your internal cost model.

## What Modelright does not do

- No benchmark scores stored (we link to public leaderboards instead).
- No inference hosting or API proxy.
- No prompt optimization or routing logic.

## Next ingest runs

The ingest pipeline runs every 6 hours. Provider price changes (e.g., OpenAI's 2024-08 GPT-4o price drop) appear in the catalog within one cycle. Snapshots retain the previous price so you can verify when a change occurred.

---

*Modelright is open source. The ingest schema, scheduler, and API are in this repo. Try the live catalog at modelright.dev.*
