# Spec-Led Model Selection: Stop Guessing Token Pricing and Context Limits

Media: https://ai-gateway-outputs.0d37909e38d3e99c29fa2cd343ac421a.r2.cloudflarestorage.com/provider-outputs/01a218ea-80c0-77dd-8bdf-cc4723ed3cc1/37313714-6240-4f7e-aa67-e905d79581ab?X-Amz-Expires=86400&X-Amz-Date=20261126T173233Z&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=766732b82d28513d70fca8df61685d41%2F20261126%2Fauto%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host&X-Amz-Signature=37b5fd838a067628a2411b47ce80e694b59c22b8878cbee5bfb4e27d136ed64d

Selecting LLMs for production requires quantitative trade-offs rather than provider marketing claims. When shipping developer workflows, batch document processing, or multi-tenant AI agents, unit economics scale directly with per-million-token cost, context window limits, and throughput benchmarks.

[Modelright](https://modelright.dev?utm_campaign=modelright-marketing-cadence) provides a live-synced model catalog that tracks pricing structures, context limits, and speed benchmarks across top AI providers.

## Key Selection Metrics for Production Workloads

### 1. Per-1M Token Unit Pricing
Token costs vary by orders of magnitude across model tiers:
- **High-capacity flagship models**: Range from $2.50 to $15.00 per 1M input tokens and $10.00 to $60.00 per 1M output tokens.
- **Lightweight efficiency models**: Range from $0.05 to $0.50 per 1M input tokens.

Modelright continuously logs price updates hourly from OpenRouter and provider sources, maintaining an append-only snapshot log for real-time tracking at [`/changes`](https://modelright.dev/changes?utm_campaign=modelright-marketing-cadence).

### 2. Context Windows and Effective Limits
Evaluating maximum token windows alongside task requirements:
- Large context windows (128k to 2M tokens) enable full repository indexing and multi-document RAG.
- Task-tailored context filtering is available via curated pick routes such as [`/pick/long-context`](https://modelright.dev/pick/long-context?utm_campaign=modelright-marketing-cadence) and [`/pick/coding`](https://modelright.dev/pick/coding?utm_campaign=modelright-marketing-cadence).

### 3. Side-by-Side Model Benchmarking
Compare up to four models simultaneously on [`/compare`](https://modelright.dev/compare?utm_campaign=modelright-marketing-cadence) to evaluate input/output costs, speed metrics enriched via Artificial Analysis, and modal capabilities (vision, audio, function calling).

## Programmable Spec Access for Agents & Tooling

Modelright exposes machine-readable specifications across multiple integrations:
- **Public REST API**: Query specs programmatically at `GET /api/v1/models`.
- **MCP Server**: Connect directly via Streamable-HTTP transport at `/api/mcp` using tools like `search_models` and `compare_models`.
- **Agent Discovery**: Native support for `/llms.txt`, `/agents.txt`, and standard agent card manifests.

Explore the complete model catalog and compare specs at [modelright.dev](https://modelright.dev?utm_campaign=modelright-marketing-cadence).

## Assets
- Social Card Image: https://ai-gateway-outputs.0d37909e38d3e99c29fa2cd343ac421a.r2.cloudflarestorage.com/provider-outputs/01a218ea-80c0-77dd-8bdf-cc4723ed3cc1/37313714-6240-4f7e-aa67-e905d79581ab?X-Amz-Expires=86400&X-Amz-Date=20261126T173233Z&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=766732b82d28513d70fca8df61685d41%2F20261126%2Fauto%2Fs3%2Faws4_request&X-Amz-SignedHeaders=host&X-Amz-Signature=37b5fd838a067628a2411b47ce80e694b59c22b8878cbee5bfb4e27d136ed64d
