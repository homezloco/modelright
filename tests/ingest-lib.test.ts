import { describe, it, expect, vi, beforeEach } from 'vitest';

let sharedQueue: (unknown[] | Error)[] = [];
function makeDb() {
  const queue = sharedQueue;
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          const rows = queue.shift() ?? [];
          return (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            rows instanceof Error ? reject(rows) : resolve(rows);
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
vi.mock('../src/lib/sources/openrouter', async () => ({
  fetchOpenRouterCatalog: vi.fn(async () => [
    { id: 'openai/gpt-5', name: 'GPT-5', context_length: 1000000, pricing: { prompt: '0.0000025', completion: '0.00001' } },
  ]),
  normalizeOpenRouter: (await vi.importActual<any>('../src/lib/sources/openrouter')).normalizeOpenRouter,
}));
vi.mock('../src/lib/sources/artificial-analysis', () => ({
  fetchAAModels: vi.fn(async () => []),
  normalizeAAModels: vi.fn(() => []),
}));

const {
  processIngestPayload,
  verifyBearerToken,
  verifyCronSecret,
  syncOpenRouterCatalog,
  syncAllSources,
} = await import('../src/lib/ingest');

const item = {
  provider: { slug: 'openai', name: 'OpenAI' },
  slug: 'gpt-5', name: 'GPT-5',
  contextWindow: 1000000,
  inputPricePerM: '2.5', outputPricePerM: '10',
  modalityTags: ['text'], availability: 'available',
};

beforeEach(() => {
  sharedQueue = [];
  delete process.env.INGEST_TOKEN;
  delete process.env.CRON_SECRET;
  delete process.env.AA_API_KEY;
});

describe('q-0016 token verifiers', () => {
  it('verifyBearerToken accepts the configured token only', () => {
    process.env.INGEST_TOKEN = 'tok';
    const ok = new Request('http://x', { headers: { authorization: 'Bearer tok' } });
    const bad = new Request('http://x', { headers: { authorization: 'Bearer no' } });
    const none = new Request('http://x');
    expect(verifyBearerToken(ok)).toBe(true);
    expect(verifyBearerToken(bad)).toBe(false);
    expect(verifyBearerToken(none)).toBe(false);
  });

  it('verifyBearerToken is false when INGEST_TOKEN unset', () => {
    const r = new Request('http://x', { headers: { authorization: 'Bearer tok' } });
    expect(verifyBearerToken(r)).toBe(false);
  });

  it('verifyCronSecret maps unset/unauthorized/ok', () => {
    const noHeader = new Request('http://x');
    expect(verifyCronSecret(noHeader)).toBe('unset');
    process.env.CRON_SECRET = 'sec';
    expect(verifyCronSecret(noHeader)).toBe('unauthorized');
    const ok = new Request('http://x', { headers: { 'x-cron-secret': 'sec' } });
    expect(verifyCronSecret(ok)).toBe('ok');
  });
});

describe('q-0016 processIngestPayload', () => {
  it('enrich mode skips unknown models', async () => {
    sharedQueue = [
      [{ id: 'p1' }],  // provider hit
      [],              // model miss
      [],              // ingestLog
    ];
    const res = await processIngestPayload('artificial-analysis', [item], { enrich: true });
    expect(res).toEqual({ received: 1, upserted: 0, skipped: 1 });
  });

  it('enrich mode updates liveness only on known models', async () => {
    sharedQueue = [
      [{ id: 'p1' }],
      [{ id: 'm1' }],
      [{ id: 'm1' }],  // update returning
      [],              // snapshot
      [],              // ingestLog
    ];
    const res = await processIngestPayload('artificial-analysis', [item], { enrich: true });
    expect(res.upserted).toBe(1);
    expect(res.skipped).toBe(0);
  });

  it('logs an error row and rethrows on db failure', async () => {
    sharedQueue = [new Error('boom'), []];
    await expect(processIngestPayload('x', [item])).rejects.toThrow('boom');
  });
});

describe('q-0016 source syncs', () => {
  it('syncOpenRouterCatalog upserts and marks removed models', async () => {
    sharedQueue = [
      [{ id: 'p1' }],   // provider hit
      [{ id: 'm1' }],   // model hit
      [{ id: 'm1' }],   // update returning
      [],               // snapshot
      [],               // ingestLog
      [{ id: 'm9', slug: 'old', providerSlug: 'x', status: 'ok' }], // allModels -> not in feed
      [],               // removed update
    ];
    const res = await syncOpenRouterCatalog();
    expect(res.fetched).toBe(1);
    expect(res.upserted).toBe(1);
    expect(res.removed).toBe(1);
  });

  it('syncAllSources reports AA error when key missing', async () => {
    sharedQueue = [
      [{ id: 'p1' }], [{ id: 'm1' }], [{ id: 'm1' }], [], [], [[]],
    ];
    const res = await syncAllSources();
    expect(res.openrouter.upserted).toBe(1);
    expect((res.artificialAnalysis as { error: string }).error).toContain('AA_API_KEY');
  });
});
