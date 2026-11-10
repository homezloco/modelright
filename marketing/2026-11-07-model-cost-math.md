# The Math of Choosing a Model: How Modelright Calculates Production LLM Costs

You don't need a benchmark suite to decide what model your production workload should use. You need the unit economics.

The core question is simple: for your token mix, which model's input and output pricing puts your monthly API spend in the right place? The answer depends on numbers most teams never compute — input token ratios, context window sizes, cache discounts, and output caps.

Modelright's cost calculator turns those numbers into an answer per model, straight from live-synced specs.

 ---

## The Input/Output Split Usually Decides It

Most production LLM workloads are input-heavy. Retrieval-augmented generation runs at input-to-output ratios between 10:1 and 50:1. Classification, extraction, and intent routing sit even higher.

At those ratios, **input token pricing is ~96% of total spend** — not output pricing, and not "which model is smartest."

| Workload | Typical Input / Output Ratio | Dominant Cost |
|---|---|---|
| Consumer chat | ~2:1 | Output |
| RAG / retrieval | ~10:1 to 50:1 | Input |
| Classification / extraction | ~50:1+ | Input |

If your ratio is 20:1 (5k input / 250 output), then swapping from a $2.50/$10.00 flagship (2.50 input per 1M tokens) to a $0.15/$0.60 mini (0.15 input per 1M) changes your input cost by 94% — while your output cost stays proportionally flat.

 ---

## Context Window Is a Cost Decision, Not Just a Capability One

A 2M-token context window sounds free until you price it. Feeding a full codebase or document set into context costs input tokens at the model's published rate.

| Model | Context | Input $/1M | Output $/1M |
|---|---|---:|---:---:|
| `gpt-4o` | 128k | $2.50 | $10.00 |
| `claude-3-5-sonnet-20241022` | 200k | $3.00 | $15.00 |
| `gemini-1.5-pro` | 2M | $1.25 | $5.00 |

For long-context RAG, the difference between paying per token for 200k vs 2M context is roughly an order of magnitude in input spend — even at the same per-token price.

 ---

## The Calculator, Applied

The [Modelright calculator](https://modelright.dev/calculator) takes your inputs per request — input tokens, output tokens, requests per day — and computes cost per request, per day, and per 30-day month, using the live $/1M prices for that model.

Example: 5k input / 250 output tokens per request, 1,000 requests/day.

| | Input tokens | Output tokens |
|---|---:|---:|
| Per request | 5,000 | 250 |
| Per day (1k req) | 5M | 250k |

At `gpt-4o` pricing: input $12.50/day, output $2.50/day → **$15.00/day**.

At `gpt-4o-mini` pricing: input $0.75/day, output $0.15/day → **$0.90/day**.

That's not a benchmark difference. It's a math difference — and the calculator makes it before you ship.

 ---

## What the Catalog Actually Syncs

Modelright's live registry tracks, per model, the fields your cost model depends on:

- Context window (tokens) — from provider API / docs
- Input price per 1M tokens — from provider pricing pages
- Output price per 1M tokens — from provider pricing pages
- Cached input price, where the provider publishes one
- Modality tags — so you don't pay for vision/audio when you don't use it
- Availability status — so you don't route to a `degraded` model thinking it's fine

All of it refreshes hourly via the OpenRouter ingest pipeline, with benchmark enrichment from Artificial Analysis.

 ---

## Pick the Cheapest Model That Fits the Math

1. Estimate tokens per request (input vs output) from your actual workload.
2. Run the numbers for candidate models using live $/1M pricing.
3. Filter by context window — the smallest model that fits your longest input avoids paying for capacity you don't use.
4. Factor in cache discounts if your workload repeats system prompts or retrieved context.
5. Let the [calculator](https://modelright.dev/calculator) do the arithmetic.

The cheapest production model is rarely the cheapest per-token. It's the one whose math fits your workload.

 ---

*Built by Homezloco. MIT licensed. Explore the live catalog at [modelright.dev](https://modelright.dev).*