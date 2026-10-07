import { AGENT_SURFACE, MCP_TOOLS } from '@/lib/agent-surface';
import { TASK_RULES, TaskCategory } from '@/lib/picks';

export const dynamic = 'force-static';

export function GET() {
  const tasks = (Object.keys(TASK_RULES) as TaskCategory[]).join(', ');
  const toolLines = MCP_TOOLS.map((t) => `  - ${t.name}: ${t.description}`).join('\n');

  const content = `# modelright

> Modelright tracks AI model specifications, pricing, availability, and snapshots across providers.

## Main Routes
- /models : Full list of AI models with pricing and context windows
- /providers : Provider index; /providers/{slug} for per-provider model lists
- /pick : Curated top-10 task picks index
- /pick/{task} : Top-10 model picks per task; task is one of: ${tasks}
- /compare : Side-by-side spec and price comparison tool
  - /compare?m={provider/slug},{provider/slug},... : ad-hoc comparison of 2+ models
  - /compare/{a}-vs-{b} : canonical pair pages, e.g. /compare/openai--gpt-4o-vs-anthropic--claude-sonnet
- /changes : Recent catalog changes
- /calculator : Cost calculator — tokens in/out and requests/day to estimated spend
- /api : API documentation with examples

## REST API
- GET /api/v1/models : JSON list of all models (filters: provider, modality, status, minContext, maxInputPrice, freeOnly, sort, limit, offset)
- GET /api/v1/models/{provider}/{slug} : JSON model detail including last 30 price snapshots
- GET /api/models/search?q= : fuzzy model name search
- GET /changes/rss.xml : RSS feed of catalog changes
- GET /openapi.json : OpenAPI 3.1 document (also /.well-known/openapi.json)

## MCP (agent interface)
- POST ${AGENT_SURFACE.mcpEndpoint} : MCP over Streamable HTTP (Accept: application/json, text/event-stream). Tools:
${toolLines}

## Agent discovery
- /.well-known/agent-card.json : A2A agent card listing skills 1:1 with the MCP tools
- /.well-known/mcp/server-card.json : Smithery-format MCP server card
- /agents.txt : Plain-text agent interface summary
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
