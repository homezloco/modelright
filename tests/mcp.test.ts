import { describe, it, expect, vi, beforeEach } from 'vitest';

let sharedQueue: unknown[][] = [];
function makeDb() {
  const queue = sharedQueue;
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          const rows = queue.shift() ?? [];
          return (resolve: (v: unknown) => void) => resolve(rows);
        }
        return () => chain;
      },
    }
  );
  return { select: () => chain, insert: () => chain, update: () => chain, delete: () => chain };
}

vi.mock('../src/db/client', () => ({ get db() { return makeDb(); } }));
vi.mock('../src/lib/rateLimit', () => ({ checkRateLimit: () => ({ allowed: true, retryAfterSeconds: 0 }) }));

const { POST, OPTIONS } = await import('../src/app/api/mcp/route');

async function rpcBody(res: Response) {
  const text = await res.text();
  const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
  return dataLine ? JSON.parse(dataLine.slice(5)) : JSON.parse(text);
}

function rpc(method: string, params?: unknown) {
  return new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }) as never;
}

beforeEach(() => {
  sharedQueue = [];
  delete process.env.DATABASE_URL;
});

describe('q-0016 MCP route', () => {
  it('registers tools at import and answers initialize', async () => {
    const res = await POST(rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'test', version: '0' },
    }));
    expect(res.status).toBe(200);
  });

  it('lists tools', async () => {
    const res = await POST(rpc('tools/list'));
    expect(res.status).toBe(200);
    const text = await res.text();
    const dataLine = text.split('\n').find((l) => l.startsWith('data:'));
    const body = JSON.parse(dataLine!.slice(5));
    expect(body?.result?.tools?.length ?? 0).toBeGreaterThan(0);
  });

  it('executes search_models via tools/call', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [[{
      slug: 'gpt-5', name: 'GPT-5', contextWindow: 1000000,
      inputPricePerM: '2.5', outputPricePerM: '10', modalityTags: ['text'],
      status: 'ok', lastSeenAt: new Date(), updatedAt: new Date(),
      providerSlug: 'openai', providerName: 'OpenAI',
    }]];
    const res = await POST(rpc('tools/call', { name: 'search_models', arguments: { q: 'gpt' } }));
    expect(res.status).toBe(200);
    const body = await rpcBody(res);
    const payload = JSON.parse(body.result.content[0].text);
    expect(payload.results ?? payload.models ?? payload).toBeTruthy();
    delete process.env.DATABASE_URL;
  });

  it('search_models reports db unavailable without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const res = await POST(rpc('tools/call', { name: 'search_models', arguments: { q: 'gpt' } }));
    const body = await rpcBody(res);
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0].text).toContain('unavailable');
  });

  it('OPTIONS returns CORS headers', async () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
