import { NextResponse } from "next/server";

// Static MCP server card for directory crawlers that can't scan the live
// endpoint (Smithery's documented fallback format — see
// https://smithery.ai/docs/build/publish#static-server-card).
export const dynamic = "force-static";

const card = {
  serverInfo: {
    name: "Modelright",
    version: "0.1.0",
  },
  description:
    "LLM model registry: providers, models, context windows, per-1M-token pricing, modality tags, availability status, and price/availability snapshots over time.",
  homepage: "https://modelright.dev",
  documentationUrl: "https://modelright.dev/llms.txt",
  endpoint: {
    url: "https://modelright.dev/api/mcp",
    transport: "streamable-http",
  },
  authentication: {
    required: false,
    schemes: [],
    notes: "All tools are read-only and unauthenticated, rate-limited per caller IP.",
  },
  tools: [
    {
      name: "list_providers",
      description: "List providers tracked by the registry with their model counts.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "search_models",
      description:
        "Substring search across model name, slug, and provider — the fast path to a model's provider/slug pair.",
      inputSchema: {
        type: "object",
        required: ["q"],
        properties: {
          q: { type: "string", maxLength: 100, description: "Search text, e.g. 'sonnet'" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
    {
      name: "list_models",
      description:
        "List tracked models with pricing and context windows. Filter by provider, modality tag, status, or price/context bounds.",
      inputSchema: {
        type: "object",
        properties: {
          provider: { type: "string" },
          modality: { type: "string" },
          status: { type: "string" },
          minContextWindow: { type: "integer" },
          maxInputPricePerM: { type: "number" },
          sort: { type: "string", enum: ["name", "input_price_asc", "input_price_desc", "context_desc"] },
          limit: { type: "integer", minimum: 1, maximum: 500 },
        },
      },
    },
    {
      name: "get_model",
      description:
        "Full detail for one model (provider+slug): specs, current price, status, and recent price/availability snapshots.",
      inputSchema: {
        type: "object",
        required: ["provider", "slug"],
        properties: {
          provider: { type: "string" },
          slug: { type: "string" },
          snapshots: { type: "integer", minimum: 0, maximum: 50 },
        },
      },
    },
    {
      name: "compare_models",
      description:
        "Side-by-side comparison of 2-10 models by provider/slug: context window, prices, modalities, status.",
      inputSchema: {
        type: "object",
        required: ["models"],
        properties: {
          models: {
            type: "array",
            minItems: 2,
            maxItems: 10,
            items: {
              type: "object",
              required: ["provider", "slug"],
              properties: { provider: { type: "string" }, slug: { type: "string" } },
            },
          },
        },
      },
    },
    {
      name: "get_ingest_status",
      description: "Registry totals and the most recent ingest runs (source, model count, status, time).",
      inputSchema: {
        type: "object",
        properties: { limit: { type: "integer", minimum: 1, maximum: 50 } },
      },
    },
  ],
  resources: [],
  prompts: [],
};

export function GET() {
  return NextResponse.json(card, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
