import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const { GET: listGet } = await import('../src/app/api/v1/models/route');
const { GET: detailGet } = await import('../src/app/api/v1/models/[provider]/[slug]/route');
const { POST: ingestPost } = await import('../src/app/api/ingest/route');
const { POST: syncPost } = await import('../src/app/api/cron/sync/route');
const { GET: searchGet } = await import('../src/app/api/models/search/route');

const modelRow = {
  provider: 'openai', slug: 'gpt-5', name: 'GPT-5', providerName: 'OpenAI',
  contextWindow: 1000000, inputPricePerM: '2.5', outputPricePerM: '10',
  modalityTags: ['text'], status: 'ok', updatedAt: new Date('2026-10-06'),
};

function req(url: string, init?: RequestInit) {
  return new (require('next/server').NextRequest)(new URL(url, 'http://localhost'), init);
}

beforeEach(() => {
  sharedQueue = [];
  process.env.INGEST_TOKEN = 'tok';
  delete process.env.CRON_SECRET;
  delete process.env.DATABASE_URL;
});

describe('q-0016 route tests', () => {
  it('GET /api/v1/models returns envelope + CORS', async () => {
    sharedQueue = [[{ value: 1n }], [modelRow]];
    const res = await listGet(req('http://localhost/api/v1/models?provider=openai'));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    const body = await res.json();
    expect(body.total).toBe(1);
    expect(body.data[0].id).toBe('openai/gpt-5');
  });

  it('GET /api/v1/models honors filter params', async () => {
    sharedQueue = [[{ value: 0n }], []];
    const res = await listGet(req('http://localhost/api/v1/models?minContext=200000&freeOnly=1&limit=999'));
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.limit).toBe(200);
  });

  it('GET /api/v1/models/{p}/{s} returns detail with snapshots', async () => {
    sharedQueue = [
      [{ ...modelRow, modelId: 'm1' }],
      [{ capturedAt: new Date(), availability: 'available', inputPricePerM: '2.5', outputPricePerM: '10' }],
    ];
    const res = await detailGet(req('http://localhost/x'), { params: { provider: 'openai', slug: 'gpt-5' } });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.snapshots).toHaveLength(1);
  });

  it('GET /api/v1/models/{p}/{s} returns 404 for unknown pair', async () => {
    sharedQueue = [[]];
    const res = await detailGet(req('http://localhost/x'), { params: { provider: 'nope', slug: 'nope' } });
    expect(res.status).toBe(404);
  });

  it('POST /api/ingest rejects missing auth', async () => {
    const res = await ingestPost(req('http://localhost/api/ingest', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /api/ingest rejects malformed JSON with auth', async () => {
    const r = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: '{nope',
    });
    const res = await ingestPost(r as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/ingest rejects schema-invalid payload', async () => {
    const r = new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify({ models: [{ slug: 'x' }] }),
    });
    const res = await ingestPost(r as never);
    expect(res.status).toBe(400);
  });

  it('POST /api/cron/sync is 503 without CRON_SECRET', async () => {
    const res = await syncPost(req('http://localhost/api/cron/sync', { method: 'POST' }));
    expect(res.status).toBe(503);
  });

  it('POST /api/cron/sync is 401 with wrong secret', async () => {
    process.env.CRON_SECRET = 'real';
    const res = await syncPost(new Request('http://localhost/api/cron/sync', {
      method: 'POST', headers: { 'x-cron-secret': 'wrong' },
    }) as never);
    expect(res.status).toBe(401);
  });

  it('GET /api/models/search returns [] without q', async () => {
    const res = await searchGet(req('http://localhost/api/models/search'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ results: [] });
  });
});

describe('q-0016 ingest happy path', () => {
  const payload = {
    models: [{
      provider: { slug: 'openai', name: 'OpenAI' },
      slug: 'gpt-5', name: 'GPT-5',
      contextWindow: 1000000,
      inputPricePerM: '2.5', outputPricePerM: '10',
      modalityTags: ['text'], availability: 'available',
    }],
  };
  const authed = (body: unknown) =>
    new Request('http://localhost/api/ingest', {
      method: 'POST',
      headers: { authorization: 'Bearer tok', 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }) as never;

  it('inserts provider + model on first ingest', async () => {
    sharedQueue = [
      [],                              // provider select: miss
      [{ id: 'p1' }],                  // provider insert returning
      [],                              // model select: miss
      [{ id: 'm1' }],                  // model insert returning
      [],                              // snapshot insert
      [],                              // ingestLog insert
    ];
    const res = await ingestPost(authed(payload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.received).toBe(1);
    expect(body.upserted).toBe(1);
  });

  it('updates existing provider + model', async () => {
    sharedQueue = [
      [{ id: 'p1' }],                  // provider select: hit
      [{ id: 'm1' }],                  // model select: hit
      [{ id: 'm1' }],                  // model update returning
      [],                              // snapshot insert
      [],                              // ingestLog insert
    ];
    const res = await ingestPost(authed(payload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upserted).toBe(1);
  });
});

describe('q-0016 search with query', () => {
  it('returns matching results for ?q= via db', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [[{ id: 'm1', name: 'GPT-5', slug: 'gpt-5', providerName: 'OpenAI', providerSlug: 'openai' }]];
    const res = await searchGet(req('http://localhost/api/models/search?q=gpt'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].slug).toBe('gpt-5');
    delete process.env.DATABASE_URL;
  });

  it('falls back to static results without DATABASE_URL', async () => {
    delete process.env.DATABASE_URL;
    const res = await searchGet(req('http://localhost/api/models/search?q=gpt'));
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results[0].slug).toContain('gpt-4o');
  });
});

describe('q-0016 api docs page', () => {
  it('renders the API documentation component', async () => {
    const { default: ApiPage } = await import('../src/app/api/page');
    const el = await ApiPage();
    expect(el).toBeTruthy();
  });
});
