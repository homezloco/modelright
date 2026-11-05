# Architectural Patterns for Dynamic LLM Model Routing and Cost Optimization

When scaling multi-agent orchestrators or compound AI systems, defaulting every execution step to a single frontier model inflates inference costs significantly. A production workload containing intent classification, context retrieval, tool invocation, code synthesis, and structured JSON generation presents vastly different context window requirements and compute demands at each stage.

[Modelright](https://modelright.dev) tracks live token pricing, context windows, provider availability, and capability metadata across open-weight and proprietary models, providing programmatic data via `/api/v1/models` to power dynamic model routing layer configurations.

---

## The Economics of Model Tiering in Compound AI Systems

A multi-step agent pipeline performing codebase analysis and automated pull request generation typically follows five main execution phases:

1. **Task Triage & Intent Classification:** Short context (< 2,000 tokens), structured JSON output requirement.
2. **Context Aggregation & RAG Ingestion:** High input context (50,000–200,000+ tokens), low output requirement.
3. **Reasoning & Code Architecture Planning:** Medium context (10,000–30,000 tokens), high output quality requirement.
4. **Code Generation & File Edits:** Medium context, high code syntax reliability requirement.
5. **Syntactic & Format Validation:** Short context (< 4,000 tokens), fast validation.

### Cost Variance Across Model Tiers

Inference pricing scales dramatically between model tiers across input and output dimensions:

| Model Tier Category | Typical Input Price / 1M Tokens | Typical Output Price / 1M Tokens | Common Target Workloads |
| :--- | :--- | :--- | :--- |
| **Frontier / Flagship** | $2.50 – $5.00 | $10.00 – $15.00 | Complex reasoning, multi-file code synthesis |
| **Mid-Tier Performance** | $0.50 – $1.25 | $1.50 – $5.00 | Moderate context analysis, multi-turn dialogue |
| **Utility / Cheap Bulk** | $0.05 – $0.30 | $0.15 – $0.60 | Ingestion filtering, intent routing, format check |

If a pipeline routes 100% of requests through a flagship model rated at $2.50/1M input and $10.00/1M output, background classification and validation steps consume unnecessary compute budget.

---

## Implementing programmatic Model Routing Rules

Dynamic routing middleware evaluates incoming prompt metadata before selecting an execution endpoint. Key parameters used to route execution include:

### 1. Token Threshold Boundaries
Filtering models by minimum required context window prevents runtime context overflow errors.
* **Large Context Ingestion (≥ 200k tokens):** Query endpoints filtering for `minContext=200000` to select high-capacity models with low input token costs.
* **Micro Workloads (≤ 8k tokens):** Route to low-latency utility models with lower per-token costs.

### 2. Modality & Task Filters
Filter model choices using task-specific filters via `/api/v1/models`:
* `modality=vision`: Restrict candidate models to endpoints supporting image inputs when processing visual diagrams or screenshots.
* `maxInputPrice`: Set maximum dollar thresholds per million tokens (e.g., `maxInputPrice=0.50`) for high-volume background queue processing.

---

## Live Catalog Access via the Modelright API

Integrating dynamic catalog state directly into your routing router or CI infrastructure ensures pricing calculations and model availability remain current as providers update tiers.

### Querying Model Metadata

```bash
# Fetch models with context window >= 128k and input price <= $1.00 per 1M tokens
curl -X GET "https://modelright.dev/api/v1/models?minContext=128000&maxInputPrice=1.00&status=active"
```

### Response Payload Structure

```json
{
  "models": [
    {
      "id": "provider/model-slug",
      "name": "Model Name",
      "provider": "Provider Name",
      "contextWindow": 131072,
      "inputPricePerM": "0.1500",
      "outputPricePerM": "0.6000",
      "modalityTags": ["text", "vision"],
      "status": "active"
    }
  ]
}
```

---

## Operational Best Practices

1. **Fallback Routing Chains:** Maintain secondary model choices in routing configs to gracefully absorb provider rate limits (429) or transient server errors (5xx).
2. **Input-to-Output Cost Weighting:** For high-volume retrieval applications where input token volume dominates overall usage (95%+ of total tokens), prioritize models with low input pricing over models offering marginal output discounts.
3. **Continuous Tracking:** Track catalog updates, price reductions, and provider model additions across open and proprietary options at [modelright.dev](https://modelright.dev) or inspect differences visually on [modelright.dev/compare](https://modelright.dev/compare).
