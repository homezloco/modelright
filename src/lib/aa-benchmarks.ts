/**
 * Artificial Analysis benchmark extraction.
 *
 * AA enrich syncs (src/lib/sources/artificial-analysis.ts) land benchmark
 * indices and speed medians inside model_snapshots.rawPayload as
 * `benchmarks` (eval key -> number) and `speed`
 * ({ outputTokensPerSecond, ttftSeconds }). This picks the newest snapshot
 * row carrying those fields and shapes the four values the model-detail
 * "Benchmarks (Artificial Analysis)" card renders.
 */

export interface AABenchmarks {
  intelligenceIndex: number | null;
  codingIndex: number | null;
  outputTokensPerSecond: number | null;
  ttftSeconds: number | null;
}

interface SnapshotLike {
  rawPayload?: unknown;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Rows are expected newest-first (the model page queries
 * ORDER BY captured_at DESC). Returns the first row whose rawPayload
 * carries at least one renderable AA field, or null when none do —
 * callers render the card only on a non-null result.
 */
export function extractAABenchmarks(
  snapshotRows: SnapshotLike[] | null | undefined
): AABenchmarks | null {
  for (const row of snapshotRows ?? []) {
    const payload = asRecord(row?.rawPayload);
    if (!payload) continue;

    const benchmarks = asRecord(payload.benchmarks);
    const speed = asRecord(payload.speed);
    if (!benchmarks && !speed) continue;

    const extracted: AABenchmarks = {
      intelligenceIndex: finiteNumber(benchmarks?.artificial_analysis_intelligence_index),
      codingIndex: finiteNumber(benchmarks?.artificial_analysis_coding_index),
      outputTokensPerSecond: finiteNumber(speed?.outputTokensPerSecond),
      ttftSeconds: finiteNumber(speed?.ttftSeconds),
    };

    if (Object.values(extracted).some((v) => v !== null)) {
      return extracted;
    }
  }
  return null;
}
