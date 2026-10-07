import { describe, it, expect, vi } from 'vitest';
import { AGENT_SURFACE, MCP_TOOLS, agentCard, agentsTxt, openapiDocument, mcpServerCard } from '../src/lib/agent-surface';

vi.mock('../src/db/client', () => ({ db: {} }));
vi.mock('../src/lib/rateLimit', () => ({ checkRateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }) }));

const { GET: agentsTxtGet } = await import('../src/app/agents.txt/route');
const { GET: openapiGet } = await import('../src/app/openapi.json/route');
const { GET: wkOpenapiGet } = await import('../src/app/.well-known/openapi.json/route');
const { GET: agentCardGet } = await import('../src/app/.well-known/agent-card.json/route');
const { GET: agentJsonGet } = await import('../src/app/.well-known/agent.json/route');
const { GET: serverCardGet } = await import('../src/app/.well-known/mcp/server-card.json/route');
const { POST: wkMcpPost, OPTIONS: wkMcpOptions } = await import('../src/app/.well-known/mcp/route');

describe('q-0034 agent-discovery surface', () => {
  it('GET /agents.txt is text/plain and names the endpoints', async () => {
    const res = agentsTxtGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const body = await res.text();
    expect(body).toContain(AGENT_SURFACE.mcpEndpoint);
    expect(body).toContain('/api/v1/models');
    expect(body).toContain('/llms.txt');
    for (const t of MCP_TOOLS) expect(body).toContain(t.name);
  });

  it('GET /openapi.json and /.well-known/openapi.json serve the same doc', async () => {
    const a = await openapiGet().json();
    const b = await wkOpenapiGet().json();
    expect(a).toEqual(b);
    expect(a.openapi).toBe('3.1.0');
    expect(Object.keys(a.paths)).toContain('/api/v1/models');
    expect(Object.keys(a.paths)).toContain('/api/v1/models/{provider}/{slug}');
  });

  it('GET /.well-known/agent-card.json exposes skills 1:1 with MCP tools', async () => {
    const card = await agentCardGet().json();
    expect(card.name).toBe(AGENT_SURFACE.name);
    expect(card.capabilities.streaming).toBe(false);
    expect(card.skills.map((s: { id: string }) => s.id).sort()).toEqual(
      MCP_TOOLS.map((t) => t.name).slice().sort()
    );
  });

  it('GET /.well-known/agent.json is a 308 to agent-card.json', async () => {
    const res = agentJsonGet();
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(`${AGENT_SURFACE.baseUrl}/.well-known/agent-card.json`);
  });

  it('GET /.well-known/mcp/server-card.json is a Smithery-format card', async () => {
    const card = await serverCardGet().json();
    expect(card.endpoint).toBe(`${AGENT_SURFACE.baseUrl}${AGENT_SURFACE.mcpEndpoint}`);
    expect(card.transport).toBe('streamable-http');
    expect(card.tools.map((t: { name: string }) => t.name).sort()).toEqual(
      MCP_TOOLS.map((t) => t.name).slice().sort()
    );
  });

  it('/.well-known/mcp alias answers JSON-RPC tools/list matching the shared tool list', async () => {
    const res = await wkMcpPost(
      new Request('http://localhost/.well-known/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }) as never
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    const dataLine = text.split('\n').find((l) => l.startsWith('data:'))!;
    const body = JSON.parse(dataLine.slice(5));
    const names = body.result.tools.map((t: { name: string }) => t.name).sort();
    expect(names).toEqual(MCP_TOOLS.map((t) => t.name).slice().sort());
  });

  it('/.well-known/mcp OPTIONS carries the MCP CORS headers', async () => {
    const res = wkMcpOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-headers')).toContain('MCP-Protocol-Version');
  });

  it('shared constants drive every card (no divergent copies)', () => {
    const card = agentCard();
    const server = mcpServerCard();
    const doc = openapiDocument();
    expect(card.endpoints.mcp).toBe(server.endpoint);
    expect(card.endpoints.rest).toBe(`${AGENT_SURFACE.baseUrl}/api/v1`);
    expect(doc.servers[0].url).toBe(AGENT_SURFACE.baseUrl);
    expect(agentsTxt()).toContain(AGENT_SURFACE.baseUrl);
  });
});
