import { describe, test, expect } from 'vitest';
import {
  buildLeaderboard,
  buildLeaderboards,
  RANKING_DIMENSIONS,
  RankingModel,
} from '../src/lib/rankings';
import { extractAABenchmarksByModel } from '../src/lib/aa-benchmarks';
import { AABenchmarks } from '../src/lib/aa-benchmarks';

const noBench: AABenchmarks = {
  intelligenceIndex: null,
  codingIndex: null,
  outputTokensPerSecond: null,
  ttftSeconds: null,
};

const bm = (over: Partial<AABenchmarks>): AABenchmarks => ({ ...noBench, ...over });

const model = (over: Partial<RankingModel>): RankingModel => ({
  id: 'm',
  name: 'Model',
  slug: 'model',
  providerName: 'Provider',
  providerSlug: 'provider',
  status: 'ok',
  inputPricePerM: '1.00',
  outputPricePerM: '4.00',
  benchmarks: null,
  ...over,
});

const fixture: RankingModel[] = [
  model({
    id: 'a',
    name: 'Alpha',
    slug: 'alpha',
    providerName: 'Acme',
    providerSlug: 'acme',
    inputPricePerM: '2.50',
    outputPricePerM: '10.00',
    benchmarks: bm({
      intelligenceIndex: 70.5,
      codingIndex: 60.2,
      outputTokensPerSecond: 120.4,
      ttftSeconds: 0.35,
    }),
  }),
  model({
    id: 'b',
    name: 'Beta',
    slug: 'beta',
    providerName: 'BigCo',
    providerSlug: 'bigco',
    inputPricePerM: '0.40',
    outputPricePerM: '1.20',
    benchmarks: bm({
      intelligenceIndex: 82.1,
      codingIndex: 74.9,
      outputTokensPerSecond: 45.0,
      ttftSeconds: 0.62,
    }),
  }),
  // Partial: intelligence only — must not rank on coding/speed/ttft.
  model({
    id: 'c',
    name: 'Gamma',
    slug: 'gamma',
    providerName: 'Acme',
    providerSlug: 'acme',
    benchmarks: bm({ intelligenceIndex: 91.0 }),
  }),
  // No benchmark data at all — never ranks.
  model({ id: 'd', name: 'Delta', slug: 'delta', benchmarks: null }),
  // Removed models never rank even with benchmark data.
  model({
    id: 'e',
    name: 'Epsilon',
    slug: 'epsilon',
    status: 'removed',
    benchmarks: bm({ intelligenceIndex: 99.9, codingIndex: 99.9 }),
  }),
];

describe('q-0043 buildLeaderboard', () => {
  test('intelligence ranks highest score first with 1-based ranks', () => {
    const rows = buildLeaderboard(fixture, 'intelligence');
    expect(rows.map((r) => r.modelId)).toEqual(['c', 'b', 'a']);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows[0].score).toBe(91.0);
  });

  test('ttft ranks lowest latency first (ascending)', () => {
    const rows = buildLeaderboard(fixture, 'ttft');
    expect(rows.map((r) => r.modelId)).toEqual(['a', 'b']);
  });

  test('missing and partial benchmark rows are excluded per dimension', () => {
    const coding = buildLeaderboard(fixture, 'coding');
    expect(coding.map((r) => r.modelId)).toEqual(['b', 'a']);
    const speed = buildLeaderboard(fixture, 'speed');
    expect(speed.map((r) => r.modelId)).toEqual(['a', 'b']);
    for (const rows of [coding, speed]) {
      expect(rows.some((r) => r.modelId === 'c')).toBe(false); // partial
      expect(rows.some((r) => r.modelId === 'd')).toBe(false); // none
      expect(rows.some((r) => r.modelId === 'e')).toBe(false); // removed
    }
  });

  test('joins live registry pricing onto each row', () => {
    const rows = buildLeaderboard(fixture, 'intelligence');
    const beta = rows.find((r) => r.modelId === 'b')!;
    expect(beta.inputPricePerM).toBe(0.4);
    expect(beta.outputPricePerM).toBe(1.2);
    // missing/unparseable prices surface as null for the page's '—'
    const gamma = rows.find((r) => r.modelId === 'c')!;
    expect(gamma.inputPricePerM).toBe(1); // fixture default '1.00'
    const unpriced = buildLeaderboard(
      [model({ id: 'x', benchmarks: bm({ intelligenceIndex: 50 }), inputPricePerM: 'n/a', outputPricePerM: undefined })],
      'intelligence'
    );
    expect(unpriced[0].inputPricePerM).toBeNull();
    expect(unpriced[0].outputPricePerM).toBeNull();
  });

  test('empty input yields empty boards', () => {
    expect(buildLeaderboard([], 'intelligence')).toEqual([]);
    const boards = buildLeaderboards([]);
    expect(boards.intelligence).toEqual([]);
    expect(boards.coding).toEqual([]);
    expect(boards.speed).toEqual([]);
    expect(boards.ttft).toEqual([]);
  });

  test('respects the limit option', () => {
    const rows = buildLeaderboard(fixture, 'intelligence', { limit: 2 });
    expect(rows.map((r) => r.modelId)).toEqual(['c', 'b']);
  });

  test('exposes the four dimension descriptors', () => {
    expect(RANKING_DIMENSIONS.map((d) => d.key)).toEqual([
      'intelligence',
      'coding',
      'speed',
      'ttft',
    ]);
    for (const d of RANKING_DIMENSIONS) {
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.format(12.345)).toBeTruthy();
    }
  });
});

describe('q-0043 extractAABenchmarksByModel', () => {
  test('picks each model\'s newest benchmarked snapshot', () => {
    // Rows newest-first globally, models interleaved.
    const map = extractAABenchmarksByModel([
      { modelId: 'a', rawPayload: { benchmarks: { artificial_analysis_intelligence_index: 70 } } },
      { modelId: 'b', rawPayload: { speed: { outputTokensPerSecond: 99 } } },
      { modelId: 'a', rawPayload: { benchmarks: { artificial_analysis_intelligence_index: 55 } } },
    ]);
    expect(map.get('a')?.intelligenceIndex).toBe(70);
    expect(map.get('b')?.outputTokensPerSecond).toBe(99);
  });

  test('models without renderable AA data are absent', () => {
    const map = extractAABenchmarksByModel([
      { modelId: 'a', rawPayload: { contextWindow: 128000 } },
      { modelId: 'b', rawPayload: null },
      { modelId: 'c', rawPayload: { benchmarks: {} } },
    ]);
    expect(map.size).toBe(0);
    expect(extractAABenchmarksByModel([]).size).toBe(0);
    expect(extractAABenchmarksByModel(null).size).toBe(0);
  });
});
