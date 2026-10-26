# Calculating Token Economics for Production RAG Pipelines

When moving a Retrieval-Augmented Generation (RAG) system from prototype to production, token usage ratios shift dramatically compared to standard conversational agent workloads. While consumer chat applications often maintain a ~2:1 input-to-output token ratio, RAG architectures routinely operate at ratios between 10:1 and 50:1 due to context injection from vector stores or document search indexes.

Evaluating models for production RAG based solely on output pricing or headline benchmark scores obscures the primary cost driver: input token pricing and prompt caching economics across providers.

## The Token Balance in Production RAG

A standard production RAG request payload contains four main components:

1. **User Query**: 20–100 tokens
2. **System Instructions & Schemas**: 500–1,500 tokens
3. **Retrieved Context Chunks** (5 to 20 passages at 400 tokens/chunk): 2,000–8,000 tokens
4. **Generated Answer**: 150–500 tokens

At a typical operational average of 5,000 input tokens and 250 output tokens per request (a 20:1 input-to-output ratio), **95.2% of the total token volume consists of input tokens**.

## Unit Economics Across Production Models

The following pricing and specification data is tracked live on [Modelright](https://modelright.dev):

| Model | Provider | Context Window | Input $/1M | Output $/1M | Caching Discount | Cost per 10k Requests (5k in / 250 out) |
|-------|----------|----------------|------------|-------------|------------------|-----------------------------------------|
| `gemini-1.5-flash` | Google | 1,000,000 tokens | $0.075 | $0.300 | 75% on cache hit | $4.13 (uncached) / $1.31 (cached) |
| `gpt-4o-mini` | OpenAI | 128,000 tokens | $0.150 | $0.600 | 50% on cache hit | $8.00 (uncached) / $4.25 (cached) |
| `claude-3-5-haiku` | Anthropic | 200,000 tokens | $0.800 | $4.000 | 90% on cache hit | $41.00 (uncached) / $7.00 (cached) |
| `gpt-4o` | OpenAI | 128,000 tokens | $2.500 | $10.000 | 50% on cache hit | $130.00 (uncached) / $67.50 (cached) |
| `claude-3-5-sonnet` | Anthropic | 200,000 tokens | $3.000 | $15.000 | 90% on cache hit | $153.75 (uncached) / $26.25 (cached) |

*Calculations assume a baseline prompt structure with common system instructions eligible for provider prompt caching.*

## Trade-offs in Model Selection for RAG

### 1. Lightweight vs. Frontier Models for Context Synthesis
- **Lightweight Models (`gpt-4o-mini`, `gemini-1.5-flash`, `claude-3-5-haiku`)**: Offer sub-500ms time-to-first-token (TTFT) and low unit pricing. Best suited for single-doc extraction or factual summarization where retrieved text already contains explicit answers.
- **Frontier Models (`gpt-4o`, `claude-3-5-sonnet`)**: Higher latency and cost, but necessary when synthesis requires resolving conflicting facts across multiple retrieved chunks, executing complex tool calls, or adhering to strict JSON Schema output specifications.

### 2. Large Context vs. Dense Retrieval
- **1M+ Token Context Windows**: Allow passing entire documents or codebases into context without chunking pipelines. However, total cost scales linearly with document length, and processing latencies scale with input size.
- **Vector Retrieval + Chunking**: Constrains input contexts to 2k–8k tokens per request, minimizing unit cost and maintaining fast TTFT.

## Monitoring Model Specs with Modelright

Selecting the right model requires matching workload token ratios against real-time provider specs and pricing:

- **Compare Input vs Output Ratios**: Modelright's grid displays input and output pricing side-by-side to model costs accurately for input-heavy RAG pipelines.
- **Track Context Boundaries**: Filter by maximum context limits to ensure chosen models accommodate context payloads.
- **Audit Price & Spec Changes**: Ingest pipelines monitor provider endpoint updates and retain version snapshots over time.

---

*Explore live provider specs, context limits, and pricing data at [modelright.dev](https://modelright.dev).*
