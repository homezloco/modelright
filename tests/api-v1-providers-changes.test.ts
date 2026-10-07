import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { agentsTxt, openapiDocument } from '../src/lib/agent-surface';

/**
 * Chainable drizzle-client stub: every builder method returns itself until
 * awaited, then resolves to the queued row sets in order.
 */
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
  return {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
  };
}

vi.mock('../src/db/client', () => ({ get db() { return makeDb(); } }));

const { GET: providersGet, OPTIONS: providersOptions } = await import('../src/app/api/v1/providers/route');
const { GET: changesGet, OPTIONS: changesOptions } = await import('../src/app/api/v1/changes/route');

function req(url: string) {
  return new (require('next/server').NextRequest)(new URL(url, 'http://localhost'));
}

beforeEach(() => {
  sharedQueue = [];
});

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

describe('q-0038 GET /api/v1/providers', () => {
  it('returns providers with model counts and min/max input price', async () => {
    sharedQueue = [[
      { slug: 'anthropic', name: 'Anthropic', modelCount: 3, minInputPricePerM: 0.25, maxInputPricePerM: 15 },
      { slug: 'openai', name: 'OpenAI', modelCount: '5', minInputPricePerM: '0.10', maxInputPricePerM: '60.00' },
      { slug: 'empty', name: 'Empty', modelCount: 0n, minInputPricePerM: null, maxInputPricePerM: null },
    ]];
    const res = await providersGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    const body = await res.json();
    expect(body.total).toBe(3);
    expect(body.data[0]).toEqual({
      slug: 'anthropic', name: 'Anthropic', modelCount: 3,
      minInputPricePerM: 0.25, maxInputPricePerM: 15,
    });
    expect(body.data[1].modelCount).toBe(5);
    expect(body.data[1].maxInputPricePerM).toBe(60);
    expect(body.data[2].modelCount).toBe(0);
    expect(body.data[2].minInputPricePerM).toBeNull();
  });

  it('returns 500 when the query fails', async () => {
    sharedQueue = [[{ get slug() { throw new Error('boom'); } }]];
    const res = await providersGet();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('internal_error');
  });

  it('OPTIONS answers the shared CORS preflight', async () => {
    const res = await providersOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('q-0038 GET /api/v1/changes', () => {
  const providerRows = [{ id: 'p1', slug: 'openai', name: 'OpenAI' }];
  const modelRows = [{
    id: 'm1', providerId: 'p1', slug: 'gpt-5', name: 'GPT-5',
    inputPricePerM: '2.5', outputPricePerM: '10', createdAt: daysAgo(5),
  }];
  const snapshotRows = [
    { id: 's1', modelId: 'm1', capturedAt: daysAgo(4), availability: 'available', inputPricePerM: '2.5', outputPricePerM: '10' },
    { id: 's2', modelId: 'm1', capturedAt: daysAgo(2), availability: 'available', inputPricePerM: '2.0', outputPricePerM: '10' },
    { id: 's3', modelId: 'm1', capturedAt: daysAgo(1), availability: 'unavailable', inputPricePerM: '2.0', outputPricePerM: '10' },
  ];

  it('returns 30 days of catalog events as JSON', async () => {
    sharedQueue = [providerRows, modelRows, snapshotRows];
    const res = await changesGet(req('http://localhost/api/v1/changes'));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    const body = await res.json();
    expect(body.days).toBe(30);
    expect(body.total).toBe(3);
    const types = body.data.map((e: { type: string }) => e.type);
    // newest first: removed_model (1d) > price_change (2d) > new_model (5d)
    expect(types).toEqual(['removed_model', 'price_change', 'new_model']);
    const price = body.data.find((e: { type: string }) => e.type === 'price_change');
    expect(price.modelSlug).toBe('gpt-5');
    expect(price.providerSlug).toBe('openai');
    expect(price.oldInputPrice).toBe(2.5);
    expect(price.newInputPrice).toBe(2);
    expect(price.inputPriceChangePercent).toBe(-20);
    expect(typeof price.timestamp).toBe('string');
  });

  it('honors ?days= and clamps to 90', async () => {
    sharedQueue = [providerRows, modelRows, snapshotRows];
    const res = await changesGet(req('http://localhost/api/v1/changes?days=7'));
    expect((await res.json()).days).toBe(7);

    sharedQueue = [providerRows, modelRows, snapshotRows];
    const res2 = await changesGet(req('http://localhost/api/v1/changes?days=999'));
    expect((await res2.json()).days).toBe(90);
  });

  it('returns an empty list when nothing changed', async () => {
    sharedQueue = [providerRows, [], []];
    const res = await changesGet(req('http://localhost/api/v1/changes'));
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('returns 500 when the query fails', async () => {
    sharedQueue = [providerRows, [{ get providerId() { throw new Error('boom'); } }]];
    const res = await changesGet(req('http://localhost/api/v1/changes'));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe('internal_error');
  });

  it('OPTIONS answers the shared CORS preflight', async () => {
    const res = await changesOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('q-0038 OpenAPI covers every /api/v1 route file', () => {
  function v1RoutePaths(): string[] {
    const appRoot = path.join(process.cwd(), 'src', 'app');
    const v1Root = path.join(appRoot, 'api', 'v1');
    const out: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(p);
        } else if (entry.name === 'route.ts' || entry.name === 'route.tsx') {
          const rel = path.relative(appRoot, dir);
          const urlPath =
            '/' +
            rel
              .split(path.sep)
              .map((seg) => seg.replace(/^\[(.+)\]$/, '{$1}'))
              .join('/');
          out.push(urlPath);
        }
      }
    };
    walk(v1Root);
    return out.sort();
  }

  it('every /api/v1/* route file has an OpenAPI path (and vice versa)', () => {
    const routePaths = v1RoutePaths();
    expect(routePaths.length).toBeGreaterThan(0);
    const docPaths = Object.keys(openapiDocument().paths);
    for (const p of routePaths) {
      expect(docPaths).toContain(p);
    }
    for (const p of docPaths.filter((x) => x.startsWith('/api/v1'))) {
      expect(routePaths).toContain(p);
    }
  });

  it('agents.txt REST section lists the new endpoints', () => {
    const txt = agentsTxt();
    expect(txt).toContain('/api/v1/providers');
    expect(txt).toContain('/api/v1/changes');
  });
});
