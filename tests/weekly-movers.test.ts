import { describe, test, expect } from 'vitest';
import {
  deriveWeeklyMovers,
  earliestRegistryTimestamp,
  ChangeEvent,
  ModelRow,
  SnapshotRow,
} from '../src/lib/changes';
import { formatAge } from '../src/lib/freshness';

const NOW = new Date('2026-10-08T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n: number) => new Date(NOW.getTime() - n * 60 * 60 * 1000);

function priceChange(
  modelId: string,
  timestamp: Date,
  inputPct: number,
  outputPct: number,
  prices: { oldIn: number; newIn: number; oldOut: number; newOut: number } = {
    oldIn: 10, newIn: 5, oldOut: 20, newOut: 10,
  }
): ChangeEvent {
  return {
    id: `price-${modelId}-${timestamp.getTime()}`,
    type: 'price_change',
    modelId,
    modelSlug: `${modelId}-slug`,
    modelName: `Model ${modelId}`,
    providerSlug: 'prov',
    providerName: 'Provider',
    timestamp,
    oldInputPrice: prices.oldIn,
    newInputPrice: prices.newIn,
    oldOutputPrice: prices.oldOut,
    newOutputPrice: prices.newOut,
    inputPriceChangePercent: inputPct,
    outputPriceChangePercent: outputPct,
  };
}

function newModel(modelId: string, timestamp: Date): ChangeEvent {
  return {
    id: `new-${modelId}`,
    type: 'new_model',
    modelId,
    modelSlug: `${modelId}-slug`,
    modelName: `Model ${modelId}`,
    providerSlug: 'prov',
    providerName: 'Provider',
    timestamp,
    initialInputPrice: 1,
    initialOutputPrice: 2,
  };
}

describe('deriveWeeklyMovers', () => {
  test('picks the 5 biggest price drops ordered by % decrease', () => {
    const events: ChangeEvent[] = [
      priceChange('m1', daysAgo(1), -10, -10),
      priceChange('m2', daysAgo(1), -50, -50),
      priceChange('m3', daysAgo(2), -30, -30),
      priceChange('m4', daysAgo(1), -20, -20),
      priceChange('m5', daysAgo(3), -40, -40),
      priceChange('m6', daysAgo(1), -15, -15),
      priceChange('m7', daysAgo(1), -5, -5), // 7th — must not appear
    ];

    const movers = deriveWeeklyMovers(events, { now: NOW });

    expect(movers.priceDrops.map((m) => m.modelId)).toEqual([
      'm2', 'm5', 'm3', 'm4', 'm6',
    ]);
    expect(movers.priceDrops.map((m) => m.percentChange)).toEqual([
      -50, -40, -30, -20, -15,
    ]);
  });

  test('excludes price increases and uses the bigger of input/output drops', () => {
    const events: ChangeEvent[] = [
      priceChange('up-only', daysAgo(1), 25, 10), // increase — excluded
      // input up, output down → counts at -35 on the output side
      priceChange('mixed', daysAgo(1), 10, -35, { oldIn: 1, newIn: 1.1, oldOut: 40, newOut: 26 }),
      priceChange('drop', daysAgo(1), -12, 0, { oldIn: 5, newIn: 4.4, oldOut: 8, newOut: 8 }),
    ];

    const { priceDrops } = deriveWeeklyMovers(events, { now: NOW });

    expect(priceDrops.map((m) => m.modelId)).toEqual(['mixed', 'drop']);
    expect(priceDrops[0].priceKind).toBe('output');
    expect(priceDrops[0].oldPrice).toBe(40);
    expect(priceDrops[0].newPrice).toBe(26);
    expect(priceDrops[1].priceKind).toBe('input');
  });

  test('ignores events outside the 7-day window and dedupes per model', () => {
    const events: ChangeEvent[] = [
      priceChange('m1', daysAgo(1), -10, -10),
      priceChange('m1', daysAgo(2), -45, -45), // bigger drop for same model wins
      priceChange('old', daysAgo(10), -90, -90), // outside window
    ];

    const { priceDrops } = deriveWeeklyMovers(events, { now: NOW });

    expect(priceDrops).toHaveLength(1);
    expect(priceDrops[0].modelId).toBe('m1');
    expect(priceDrops[0].percentChange).toBe(-45);
  });

  test('picks the 5 newest models ordered by recency', () => {
    const events: ChangeEvent[] = [
      newModel('n1', hoursAgo(50)),
      newModel('n2', hoursAgo(2)),
      newModel('n3', hoursAgo(30)),
      newModel('n4', hoursAgo(10)),
      newModel('n5', hoursAgo(20)),
      newModel('n6', hoursAgo(40)),
      newModel('n7', daysAgo(4)), // 7th — must not appear
      newModel('ancient', daysAgo(30)), // outside window
      {
        id: 'removed-1',
        type: 'removed_model',
        modelId: 'gone',
        modelSlug: 'gone-slug',
        modelName: 'Gone Model',
        timestamp: hoursAgo(1),
      },
    ];

    const { newestModels } = deriveWeeklyMovers(events, { now: NOW });

    expect(newestModels.map((m) => m.modelId)).toEqual([
      'n2', 'n4', 'n5', 'n3', 'n6',
    ]);
    expect(newestModels.every((m) => m.providerName === 'Provider')).toBe(true);
  });

  test('returns empty lists for an empty or quiet event list', () => {
    expect(deriveWeeklyMovers([], { now: NOW })).toEqual({
      priceDrops: [],
      newestModels: [],
    });
    expect(
      deriveWeeklyMovers([priceChange('x', daysAgo(1), 5, 5)], { now: NOW })
    ).toEqual({ priceDrops: [], newestModels: [] });
  });
});

describe('earliestRegistryTimestamp', () => {
  test('returns the oldest timestamp across models and snapshots', () => {
    const models: ModelRow[] = [
      { id: 'm1', name: 'A', slug: 'a', inputPricePerM: 1, outputPricePerM: 1, createdAt: daysAgo(3) },
      { id: 'm2', name: 'B', slug: 'b', inputPricePerM: 1, outputPricePerM: 1, createdAt: daysAgo(20) },
    ];
    const snapshots: SnapshotRow[] = [
      { id: 's1', modelId: 'm1', capturedAt: daysAgo(1), availability: 'available', inputPricePerM: 1, outputPricePerM: 1 },
    ];

    const earliest = earliestRegistryTimestamp(models, snapshots);
    expect(earliest?.getTime()).toBe(daysAgo(20).getTime());
  });

  test('returns null for an empty registry', () => {
    expect(earliestRegistryTimestamp([], [])).toBeNull();
  });
});

describe('formatAge', () => {
  test('formats relative ages for the movers list', () => {
    expect(formatAge(hoursAgo(3), NOW)).toBe('3 hours ago');
    expect(formatAge(daysAgo(2), NOW)).toBe('2 days ago');
    expect(formatAge(null, NOW)).toBe('');
    expect(formatAge('not-a-date', NOW)).toBe('');
  });
});
