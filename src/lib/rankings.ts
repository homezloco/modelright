import type { AABenchmarks } from '@/lib/aa-benchmarks';

/**
 * /rankings leaderboard derivation.
 *
 * The page joins live model rows (registry pricing) to each model's newest
 * benchmarked-snapshot extraction (extractAABenchmarksByModel) and hands
 * the joined records here. These builders are pure: they filter to models
 * that actually carry the metric, sort per the dimension's direction, and
 * attach 1-based ranks — so ordering, exclusion, and the price join are
 * unit-testable without a DB.
 */

export type RankingDimensionKey = 'intelligence' | 'coding' | 'speed' | 'ttft';

export interface RankingModel {
  id: string;
  name: string;
  slug: string;
  providerName: string;
  providerSlug: string;
  status?: string | null;
  inputPricePerM?: string | number | null;
  outputPricePerM?: string | number | null;
  /** AA extraction from the model's newest benchmarked snapshot, or null. */
  benchmarks?: AABenchmarks | null;
}

export interface RankedRow {
  rank: number;
  modelId: string;
  modelName: string;
  modelSlug: string;
  providerName: string;
  providerSlug: string;
  score: number;
  /** Live registry pricing, USD per 1M tokens — null when unparseable. */
  inputPricePerM: number | null;
  outputPricePerM: number | null;
}

export interface RankingDimension {
  key: RankingDimensionKey;
  title: string;
  blurb: string;
  /** 'desc' ranks highest scores first; 'asc' lowest (TTFT latency). */
  direction: 'asc' | 'desc';
  score: (b: AABenchmarks) => number | null;
  format: (v: number) => string;
}

export const RANKING_DIMENSIONS: readonly RankingDimension[] = [
  {
    key: 'intelligence',
    title: 'Intelligence Index',
    blurb: 'Artificial Analysis composite intelligence score — highest first.',
    direction: 'desc',
    score: (b) => b.intelligenceIndex,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'coding',
    title: 'Coding Index',
    blurb: 'Artificial Analysis coding evaluation index — highest first.',
    direction: 'desc',
    score: (b) => b.codingIndex,
    format: (v) => v.toFixed(1),
  },
  {
    key: 'speed',
    title: 'Output Speed',
    blurb: 'Median output throughput in tokens per second — fastest first.',
    direction: 'desc',
    score: (b) => b.outputTokensPerSecond,
    format: (v) => `${v.toFixed(1)} tok/s`,
  },
  {
    key: 'ttft',
    title: 'Time to First Token',
    blurb: 'Median time to first token — lowest latency first.',
    direction: 'asc',
    score: (b) => b.ttftSeconds,
    format: (v) => `${v.toFixed(2)} s`,
  },
];

const DEFAULT_LIMIT = 25;

function parsePrice(value: string | number | null | undefined): number | null {
  const n =
    typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(n) ? n : null;
}

/**
 * Ranks models on one benchmark dimension. Only models whose newest
 * benchmarked snapshot carries the metric are included — partial
 * extractions (the field is null) and removed models never rank. Returns
 * at most `limit` rows with 1-based ranks.
 */
export function buildLeaderboard(
  models: readonly RankingModel[],
  dimension: RankingDimensionKey | RankingDimension,
  options: { limit?: number } = {}
): RankedRow[] {
  const dim =
    typeof dimension === 'string'
      ? RANKING_DIMENSIONS.find((d) => d.key === dimension)
      : dimension;
  if (!dim) return [];
  const limit = options.limit ?? DEFAULT_LIMIT;

  const rows: RankedRow[] = [];
  for (const m of models) {
    if (!m || m.status === 'removed') continue;
    const score = m.benchmarks ? dim.score(m.benchmarks) : null;
    if (score === null || !Number.isFinite(score)) continue;
    rows.push({
      rank: 0,
      modelId: m.id,
      modelName: m.name,
      modelSlug: m.slug,
      providerName: m.providerName,
      providerSlug: m.providerSlug,
      score,
      inputPricePerM: parsePrice(m.inputPricePerM),
      outputPricePerM: parsePrice(m.outputPricePerM),
    });
  }

  const sign = dim.direction === 'asc' ? 1 : -1;
  rows.sort(
    (a, b) =>
      sign * (a.score - b.score) ||
      a.providerSlug.localeCompare(b.providerSlug) ||
      a.modelSlug.localeCompare(b.modelSlug)
  );

  return rows.slice(0, limit).map((row, i) => ({ ...row, rank: i + 1 }));
}

/** All four benchmark leaderboards keyed by dimension. */
export function buildLeaderboards(
  models: readonly RankingModel[],
  options: { limit?: number } = {}
): Record<RankingDimensionKey, RankedRow[]> {
  return {
    intelligence: buildLeaderboard(models, 'intelligence', options),
    coding: buildLeaderboard(models, 'coding', options),
    speed: buildLeaderboard(models, 'speed', options),
    ttft: buildLeaderboard(models, 'ttft', options),
  };
}
