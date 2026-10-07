import { timingSafeEqual } from 'crypto';

/**
 * Admin dashboard stats derivations (q-0041).
 *
 * All functions here are pure: they take plain row arrays (as returned by
 * drizzle selects, or hand-built in tests) and return display-ready shapes.
 * The /admin page does the DB reads; tests never touch a database.
 */

/** Syncs older than this are flagged stale on the ops dashboard. */
export const STALE_SYNC_THRESHOLD_MINUTES = 120;

/**
 * Timing-safe compare for a `?token=` query param vs an env secret.
 * Mirrors the length-check + timingSafeEqual pattern in
 * src/lib/ingest.ts verifyBearerToken, but for a plain string value
 * (searchParams values may be string | string[] | undefined).
 */
export function verifyTokenParam(
  token: string | string[] | undefined | null,
  expected: string | undefined | null
): boolean {
  if (!expected || typeof token !== 'string' || token.length === 0) {
    return false;
  }
  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expected);
  if (tokenBuf.length !== expectedBuf.length) {
    return false;
  }
  return timingSafeEqual(tokenBuf, expectedBuf);
}

/** Minimal shape of a models-table row for status aggregation. */
export interface ModelStatusRow {
  status: string | null | undefined;
}

/** Counts of models grouped by status (ok / degraded / removed / unknown). */
export function statusCounts(rows: ModelStatusRow[] | null | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows ?? []) {
    const status = row?.status || 'unknown';
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

/** Minimal shape of an ingest_log row. */
export interface IngestLogRow {
  source: string;
  payloadCount: number;
  status: string;
  createdAt: Date | string;
}

export interface IngestRunSummary {
  source: string;
  payloadCount: number;
  status: string;
  ok: boolean;
  createdAt: Date;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Shapes ingest_log rows for the run-history table: newest first,
 * capped at `limit`, with an `ok` flag derived from status === 'success'.
 */
export function summarizeIngestRuns(
  rows: IngestLogRow[] | null | undefined,
  limit = 15
): IngestRunSummary[] {
  return (rows ?? [])
    .map((row) => ({
      source: row.source,
      payloadCount: row.payloadCount,
      status: row.status,
      ok: row.status === 'success',
      createdAt: toDate(row.createdAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/** Minimal shape of a model_snapshots row for volume bucketing. */
export interface SnapshotRow {
  capturedAt: Date | string;
}

export interface DayVolume {
  /** UTC day key, YYYY-MM-DD. */
  date: string;
  count: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Buckets snapshot rows into per-day counts for the trailing `days`-day
 * window ending today (UTC). Days with zero snapshots are included so the
 * table always renders a full `days`-row window, oldest first.
 */
export function snapshotVolumeByDay(
  rows: SnapshotRow[] | null | undefined,
  days = 7,
  now: Date = new Date()
): DayVolume[] {
  const window: DayVolume[] = [];
  const indexByDate = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const date = dayKey(day);
    indexByDate.set(date, window.length);
    window.push({ date, count: 0 });
  }
  for (const row of rows ?? []) {
    const captured = toDate(row.capturedAt);
    if (Number.isNaN(captured.getTime())) continue;
    const idx = indexByDate.get(dayKey(captured));
    if (idx !== undefined) {
      window[idx].count += 1;
    }
  }
  return window;
}

/** Minimal shape of a snapshot row for AA-benchmark detection. */
export interface SnapshotPayloadRow {
  modelId: string;
  rawPayload: unknown;
}

function payloadHasAAMarkers(rawPayload: unknown): boolean {
  if (rawPayload === null || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
    return false;
  }
  // AA enrich syncs land `benchmarks` and/or `speed` on rawPayload
  // (see src/lib/aa-benchmarks.ts).
  return 'benchmarks' in rawPayload || 'speed' in rawPayload;
}

/**
 * Counts distinct models having at least one snapshot whose rawPayload
 * carries AA benchmark markers (`benchmarks` or `speed` keys).
 */
export function countModelsWithAABenchmarks(
  rows: SnapshotPayloadRow[] | null | undefined
): number {
  const modelIds = new Set<string>();
  for (const row of rows ?? []) {
    if (row?.modelId && payloadHasAAMarkers(row.rawPayload)) {
      modelIds.add(row.modelId);
    }
  }
  return modelIds.size;
}

/**
 * Age in whole minutes of the newest successful ingest_log row, measured
 * from `now`. Returns null when no successful run exists — the page treats
 * that as stale too (nothing has ever synced).
 */
export function lastSyncAgeMinutes(
  rows: IngestLogRow[] | null | undefined,
  now: Date = new Date()
): number | null {
  let newest: number | null = null;
  for (const row of rows ?? []) {
    if (row?.status !== 'success') continue;
    const t = toDate(row.createdAt).getTime();
    if (Number.isNaN(t)) continue;
    if (newest === null || t > newest) {
      newest = t;
    }
  }
  if (newest === null) return null;
  return Math.max(0, Math.floor((now.getTime() - newest) / 60000));
}

/** Whether a last-sync age (minutes, or null) should trigger the stale banner. */
export function isSyncStale(ageMinutes: number | null): boolean {
  return ageMinutes === null || ageMinutes > STALE_SYNC_THRESHOLD_MINUTES;
}

/** Human-friendly age label for the last-sync stat card. */
export function formatSyncAge(ageMinutes: number | null): string {
  if (ageMinutes === null) return 'never';
  if (ageMinutes < 1) return 'just now';
  if (ageMinutes < 60) return `${ageMinutes}m ago`;
  const hours = Math.floor(ageMinutes / 60);
  if (hours < 24) {
    const mins = ageMinutes % 60;
    return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h ago` : `${days}d ago`;
}
