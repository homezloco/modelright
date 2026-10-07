/**
 * Shared constants for the agent-discovery surface (agents.txt, well-known
 * cards, OpenAPI doc). Route files render from these — never inline literals —
 * so the cards stay consistent with each other and with the MCP tool list.
 */

export const AGENT_SURFACE = {
  name: 'modelright',
  description:
    'Live registry of AI model specifications, context windows, and per-1M-token pricing across providers, synced hourly from OpenRouter with Artificial Analysis enrichment.',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://modelright.dev',
  restBase: '/api/v1',
  mcpEndpoint: '/api/mcp',
  searchEndpoint: '/api/models/search',
  llmsTxt: '/llms.txt',
  auth: 'none — all read endpoints are unauthenticated; POST /api/ingest requires `Authorization: Bearer <INGEST_TOKEN>`',
  rateLimits: {
    mcp: '60-request burst, ~1 request/second sustained, per IP',
    ingest: '10-request burst, ~1 request/second sustained, per token',
  },
  transports: ['mcp-streamable-http', 'http-json'],
} as const;

/** 1:1 with server.registerTool(...) in src/app/api/mcp/route.ts — the consistency test enforces this. */
export const MCP_TOOLS = [
  {
    name: 'list_providers',
    title: 'List providers',
    description:
      'List providers tracked by the registry with their model counts. Use provider slugs in list_models / get_model / compare_models.',
  },
  {
    name: 'search_models',
    title: 'Search models',
    description:
      "Substring search across model name, slug, and provider — the fast path to a model's provider/slug pair for the detail tools.",
  },
  {
    name: 'list_models',
    title: 'List models',
    description:
      'List tracked models with pricing and context windows. Filter by provider, modality tag, status, or price/context bounds.',
  },
  {
    name: 'get_model',
    title: 'Get model detail',
    description:
      'Full detail for one model (provider+slug from search_models): specs, current price, status, and recent price/availability snapshots.',
  },
  {
    name: 'compare_models',
    title: 'Compare models',
    description:
      'Side-by-side comparison of 2-10 models by provider/slug: context window, input/output price per 1M tokens, modalities, status.',
  },
  {
    name: 'get_ingest_status',
    title: 'Get ingest status',
    description:
      'Data-freshness check: registry totals and the most recent ingest runs (source, model count, status, time).',
  },
] as const;

export function agentsTxt(): string {
  const s = AGENT_SURFACE;
  const toolLines = MCP_TOOLS.map((t) => `  - ${t.name}: ${t.description}`).join('\n');
  return `# ${s.name} — agent interface
${s.description}

## Preferred interface
MCP over Streamable HTTP:
  POST ${s.baseUrl}${s.mcpEndpoint}
  (also mounted at POST ${s.baseUrl}/.well-known/mcp)
  Accept: application/json, text/event-stream

## Tools
${toolLines}

## REST fallback
  GET ${s.baseUrl}${s.restBase}/models[?provider=&modality=&status=&minContext=&maxInputPrice=&freeOnly=&sort=&limit=&offset=]
  GET ${s.baseUrl}${s.restBase}/models/{provider}/{slug}
  GET ${s.baseUrl}${s.searchEndpoint}?q={term}
  GET ${s.baseUrl}/openapi.json (also /.well-known/openapi.json)

## Auth
${s.auth}

## Rate limits
  MCP: ${s.rateLimits.mcp}
  Ingest: ${s.rateLimits.ingest}

## House rules
  - Read-only; no write tools are exposed to agents.
  - Prices are USD per 1M tokens; data refreshes hourly from OpenRouter.
  - Pair-wise compare pages live at /compare/{provider--slug}-vs-{provider--slug}.

See ${s.baseUrl}${s.llmsTxt} for the human-readable summary.
`;
}

export function openapiDocument() {
  const s = AGENT_SURFACE;
  return {
    openapi: '3.1.0',
    info: {
      title: `${s.name} API`,
      version: '1.0.0',
      description: s.description,
    },
    servers: [{ url: s.baseUrl }],
    paths: {
      [`${s.restBase}/models`]: {
        get: {
          operationId: 'listModels',
          summary: 'List tracked models',
          parameters: [
            { name: 'provider', in: 'query', schema: { type: 'string' } },
            { name: 'modality', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'minContext', in: 'query', schema: { type: 'integer' } },
            { name: 'maxInputPrice', in: 'query', schema: { type: 'number' } },
            { name: 'freeOnly', in: 'query', schema: { type: 'string', enum: ['1', 'true'] } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['name', 'input_price_asc', 'input_price_desc', 'context_desc'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: { '200': { description: 'Paginated model list' } },
        },
      },
      [`${s.restBase}/models/{provider}/{slug}`]: {
        get: {
          operationId: 'getModel',
          summary: 'Model detail with recent price snapshots',
          parameters: [
            { name: 'provider', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': { description: 'Model detail' },
            '404': { description: 'Unknown provider/slug' },
          },
        },
      },
      [s.searchEndpoint]: {
        get: {
          operationId: 'searchModels',
          summary: 'Substring search across name, slug, provider',
          parameters: [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
          responses: { '200': { description: 'Up to 10 matching models' } },
        },
      },
      [s.mcpEndpoint]: {
        post: {
          operationId: 'mcp',
          summary: 'MCP over Streamable HTTP — see /.well-known/mcp/server-card.json for tools',
          responses: { '200': { description: 'JSON-RPC / SSE response' } },
        },
      },
    },
  };
}

/** A2A agent card. Skills are 1:1 with MCP_TOOLS — enforced by test. */
export function agentCard() {
  const s = AGENT_SURFACE;
  return {
    name: s.name,
    description: s.description,
    url: s.baseUrl,
    version: '1.0.0',
    capabilities: { streaming: false, pushNotifications: false },
    transports: [...s.transports],
    authentication: { schemes: ['none'] },
    endpoints: {
      mcp: `${s.baseUrl}${s.mcpEndpoint}`,
      rest: `${s.baseUrl}${s.restBase}`,
      openapi: `${s.baseUrl}/openapi.json`,
    },
    skills: MCP_TOOLS.map((t) => ({
      id: t.name,
      name: t.title,
      description: t.description,
    })),
  };
}

/** Smithery-format server card. */
export function mcpServerCard() {
  const s = AGENT_SURFACE;
  return {
    name: s.name,
    description: s.description,
    endpoint: `${s.baseUrl}${s.mcpEndpoint}`,
    transport: 'streamable-http',
    authentication: 'none',
    tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
  };
}
