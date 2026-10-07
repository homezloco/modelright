import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  verifyTokenParam,
  statusCounts,
  summarizeIngestRuns,
  snapshotVolumeByDay,
  countModelsWithAABenchmarks,
  lastSyncAgeMinutes,
  isSyncStale,
  formatSyncAge,
  STALE_SYNC_THRESHOLD_MINUTES,
} from '../src/lib/admin-stats';

/**
 * Chainable drizzle-client stub (same pattern as tests/routes.test.ts):
 * every builder method returns itself until awaited, then resolves to the
 * queued row sets in order.
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
  return { select: () => chain, insert: () => chain, update: () => chain, delete: () => chain };
}

vi.mock('../src/db/client', () => ({ get db() { return makeDb(); } }));

const { default: AdminPage } = await import('../src/app/admin/page');

const NOW = new Date('2026-10-08T12:00:00Z');

beforeEach(() => {
  sharedQueue = [];
  delete process.env.ADMIN_TOKEN;
  delete process.env.DATABASE_URL;
});

describe('q-0041 verifyTokenParam', () => {
  it('accepts an exact token match', () => {
    expect(verifyTokenParam('s3cret', 's3cret')).toBe(true);
  });

  it('rejects a mismatched token', () => {
    expect(verifyTokenParam('wrong', 's3cret')).toBe(false);
  });

  it('rejects a token of different length', () => {
    expect(verifyTokenParam('s3cret-extra', 's3cret')).toBe(false);
    expect(verifyTokenParam('s3', 's3cret')).toBe(false);
  });

  it('rejects missing/empty token and unset expected', () => {
    expect(verifyTokenParam(undefined, 's3cret')).toBe(false);
    expect(verifyTokenParam(null, 's3cret')).toBe(false);
    expect(verifyTokenParam('', 's3cret')).toBe(false);
    expect(verifyTokenParam('s3cret', undefined)).toBe(false);
    expect(verifyTokenParam('s3cret', '')).toBe(false);
  });

  it('rejects array-valued params', () => {
    expect(verifyTokenParam(['s3cret', 's3cret'], 's3cret')).toBe(false);
  });
});

describe('q-0041 statusCounts', () => {
  it('counts models grouped by status', () => {
    const counts = statusCounts([
      { status: 'ok' },
      { status: 'ok' },
      { status: 'degraded' },
      { status: 'removed' },
    ]);
    expect(counts).toEqual({ ok: 2, degraded: 1, removed: 1 });
  });

  it('buckts nullish status as unknown and handles empty input', () => {
    expect(statusCounts([{ status: null }, { status: undefined }, {} as any])).toEqual({
      unknown: 3,
    });
    expect(statusCounts([])).toEqual({});
    expect(statusCounts(null)).toEqual({});
  });
});

describe('q-0041 summarizeIngestRuns', () => {
  const rows = [
    { source: 'openrouter', payloadCount: 10, status: 'success', createdAt: '2026-10-08T01:00:00Z' },
    { source: 'artificial-analysis', payloadCount: 5, status: 'error', createdAt: '2026-10-08T03:00:00Z' },
    { source: 'openrouter', payloadCount: 12, status: 'success', createdAt: '2026-10-08T02:00:00Z' },
  ];

  it('sorts newest-first and marks ok by status', () => {
    const runs = summarizeIngestRuns(rows);
    expect(runs.map((r) => r.createdAt.toISOString())).toEqual([
      '2026-10-08T03:00:00.000Z',
      '2026-10-08T02:00:00.000Z',
      '2026-10-08T01:00:00.000Z',
    ]);
    expect(runs[0].ok).toBe(false);
    expect(runs[1].ok).toBe(true);
    expect(runs[0].source).toBe('artificial-analysis');
    expect(runs[0].payloadCount).toBe(5);
  });

  it('caps the run list at limit and tolerates empty input', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      source: 'openrouter',
      payloadCount: i,
      status: 'success',
      createdAt: new Date(NOW.getTime() - i * 60000),
    }));
    expect(summarizeIngestRuns(many, 5)).toHaveLength(5);
    expect(summarizeIngestRuns(many)).toHaveLength(15);
    expect(summarizeIngestRuns(undefined)).toEqual([]);
  });
});

describe('q-0041 snapshotVolumeByDay', () => {
  it('buckets snapshots into UTC days with zero-filled gaps', () => {
    const rows = [
      { capturedAt: new Date('2026-10-08T08:00:00Z') },
      { capturedAt: '2026-10-08T09:30:00Z' },
      { capturedAt: new Date('2026-10-05T23:59:59Z') },
    ];
    const volume = snapshotVolumeByDay(rows, 7, NOW);
    expect(volume).toHaveLength(7);
    expect(volume[0].date).toBe('2026-10-02');
    expect(volume[6].date).toBe('2026-10-08');
    expect(volume[6].count).toBe(2);
    expect(volume[3].count).toBe(1); // 2026-10-05
    expect(volume.filter((d) => d.count === 0)).toHaveLength(5);
  });

  it('drops rows outside the window and invalid dates', () => {
    const rows = [
      { capturedAt: new Date('2026-09-01T00:00:00Z') }, // too old
      { capturedAt: 'not-a-date' },
    ];
    const volume = snapshotVolumeByDay(rows, 7, NOW);
    expect(volume.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });
});

describe('q-0041 countModelsWithAABenchmarks', () => {
  it('counts distinct models whose payload carries benchmarks/speed', () => {
    const rows = [
      { modelId: 'm1', rawPayload: { benchmarks: { x: 1 } } },
      { modelId: 'm1', rawPayload: { benchmarks: { x: 2 } } }, // dup model
      { modelId: 'm2', rawPayload: { speed: { outputTokensPerSecond: 50 } } },
      { modelId: 'm3', rawPayload: { slug: 'no-markers' } },
      { modelId: 'm4', rawPayload: null },
      { modelId: 'm5', rawPayload: 'string-payload' },
      { modelId: 'm6', rawPayload: [1, 2, 3] },
    ];
    expect(countModelsWithAABenchmarks(rows)).toBe(2);
  });

  it('handles empty input', () => {
    expect(countModelsWithAABenchmarks([])).toBe(0);
    expect(countModelsWithAABenchmarks(undefined)).toBe(0);
  });
});

describe('q-0041 lastSyncAgeMinutes + staleness', () => {
  const rows = [
    { source: 'openrouter', payloadCount: 5, status: 'success', createdAt: new Date(NOW.getTime() - 30 * 60000) },
    { source: 'openrouter', payloadCount: 5, status: 'error', createdAt: new Date(NOW.getTime() - 5 * 60000) },
    { source: 'aa', payloadCount: 5, status: 'success', createdAt: new Date(NOW.getTime() - 90 * 60000) },
  ];

  it('ages from the newest success, ignoring error rows', () => {
    expect(lastSyncAgeMinutes(rows, NOW)).toBe(30);
  });

  it('returns null when no successful run exists', () => {
    expect(
      lastSyncAgeMinutes([{ source: 'x', payloadCount: 1, status: 'error', createdAt: NOW }], NOW)
    ).toBeNull();
    expect(lastSyncAgeMinutes([], NOW)).toBeNull();
  });

  it('clamps future timestamps to zero', () => {
    expect(
      lastSyncAgeMinutes(
        [{ source: 'x', payloadCount: 1, status: 'success', createdAt: new Date(NOW.getTime() + 60000) }],
        NOW
      )
    ).toBe(0);
  });

  it('flags stale when age exceeds 2h or sync never ran', () => {
    expect(isSyncStale(STALE_SYNC_THRESHOLD_MINUTES + 1)).toBe(true);
    expect(isSyncStale(STALE_SYNC_THRESHOLD_MINUTES)).toBe(false);
    expect(isSyncStale(0)).toBe(false);
    expect(isSyncStale(null)).toBe(true);
  });
});

describe('q-0041 formatSyncAge', () => {
  it('formats null/minutes/hours/days', () => {
    expect(formatSyncAge(null)).toBe('never');
    expect(formatSyncAge(0)).toBe('just now');
    expect(formatSyncAge(45)).toBe('45m ago');
    expect(formatSyncAge(120)).toBe('2h ago');
    expect(formatSyncAge(150)).toBe('2h 30m ago');
    expect(formatSyncAge(1440)).toBe('1d ago');
    expect(formatSyncAge(1500)).toBe('1d 1h ago');
  });
});

describe('q-0041 /admin route gate', () => {
  const render = (token?: string) =>
    AdminPage({ searchParams: Promise.resolve(token === undefined ? {} : { token }) } as never);

  it('404s when ADMIN_TOKEN is unset, even with a token param', async () => {
    delete process.env.ADMIN_TOKEN;
    await expect(render('anything')).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('404s without the token param', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    await expect(render()).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('404s with a wrong token', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    await expect(render('wrong-secret')).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('renders the dashboard with the right token', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [
      [{ status: 'ok' }, { status: 'ok' }, { status: 'degraded' }], // models
      [{ id: 'p1' }, { id: 'p2' }], // providers
      [
        { source: 'openrouter', payloadCount: 120, status: 'success', createdAt: new Date() },
        { source: 'artificial-analysis', payloadCount: 40, status: 'error', createdAt: new Date() },
      ], // ingest_log
      [
        { modelId: 'm1', capturedAt: new Date(), rawPayload: { benchmarks: { i: 1 } } },
        { modelId: 'm2', capturedAt: new Date(), rawPayload: { slug: 'x' } },
      ], // snapshots
    ];
    const el = await render('adm-secret');
    expect(el).toBeTruthy();
  });
});
