import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { db } from '@/db/client';
import { models, providers, ingestLog, modelSnapshots } from '@/db/schema';
import { desc, gte } from 'drizzle-orm';
import {
  verifyTokenParam,
  statusCounts,
  summarizeIngestRuns,
  snapshotVolumeByDay,
  countModelsWithAABenchmarks,
  lastSyncAgeMinutes,
  isSyncStale,
  formatSyncAge,
  type IngestLogRow,
  type ModelStatusRow,
  type SnapshotPayloadRow,
  type SnapshotRow,
} from '@/lib/admin-stats';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin — modelright ops',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string | string[] | undefined }>;
}

const SNAPSHOT_WINDOW_DAYS = 7;

const card: CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.5rem',
  padding: '1rem',
};

const cardLabel: CSSProperties = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cardValue: CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#f8fafc',
  marginTop: '0.25rem',
};

const sectionTitle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: '#cbd5e1',
  marginTop: '2rem',
  marginBottom: '0.75rem',
};

const th: CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  fontSize: '0.8rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #334155',
};

const td: CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid #1e293b',
  fontSize: '0.9rem',
  color: '#cbd5e1',
};

function statusBadge(status: string) {
  const ok = status === 'success';
  const err = status === 'error';
  return (
    <span
      style={{
        padding: '0.15rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: ok ? '#065f46' : err ? '#881337' : '#334155',
        color: ok ? '#34d399' : err ? '#f43f5e' : '#94a3b8',
      }}
    >
      {status}
    </span>
  );
}

export default async function AdminPage(props: PageProps) {
  const sp = await props.searchParams;
  if (!verifyTokenParam(sp.token, process.env.ADMIN_TOKEN)) {
    notFound();
  }
  const token = typeof sp.token === 'string' ? sp.token : '';

  let modelRows: ModelStatusRow[] = [];
  let providerCount = 0;
  let ingestRows: IngestLogRow[] = [];
  let snapshotRows: (SnapshotRow & SnapshotPayloadRow)[] = [];
  let dbError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      modelRows = await db.select({ status: models.status }).from(models);

      const providerRows = await db.select({ id: providers.id }).from(providers);
      providerCount = providerRows.length;

      ingestRows = await db
        .select()
        .from(ingestLog)
        .orderBy(desc(ingestLog.createdAt))
        .limit(30);

      const windowStart = new Date();
      windowStart.setUTCDate(windowStart.getUTCDate() - (SNAPSHOT_WINDOW_DAYS - 1));
      windowStart.setUTCHours(0, 0, 0, 0);

      snapshotRows = await db
        .select({
          modelId: modelSnapshots.modelId,
          capturedAt: modelSnapshots.capturedAt,
          rawPayload: modelSnapshots.rawPayload,
        })
        .from(modelSnapshots)
        .where(gte(modelSnapshots.capturedAt, windowStart));
    } catch (err) {
      dbError = String(err);
    }
  } else {
    dbError = 'DATABASE_URL not configured';
  }

  const byStatus = statusCounts(modelRows);
  const totalModels = modelRows.length;
  const runs = summarizeIngestRuns(ingestRows);
  const volume = snapshotVolumeByDay(snapshotRows, SNAPSHOT_WINDOW_DAYS);
  const aaBenchmarkModels = countModelsWithAABenchmarks(snapshotRows);
  const syncAgeMin = lastSyncAgeMinutes(ingestRows);
  const stale = isSyncStale(syncAgeMin);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
        Admin — Ops Dashboard
      </h1>
      <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        Registry health, ingest pipeline status, and snapshot volume. Ops-only; unlisted.{' '}
        <Link href={`/admin/analytics?token=${encodeURIComponent(token)}`} style={{ color: '#38bdf8' }}>
          analytics →
        </Link>
      </p>

      {stale && (
        <div
          style={{
            backgroundColor: '#451a03',
            border: '1px solid #b45309',
            color: '#fde68a',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Stale sync warning:</strong>{' '}
          {syncAgeMin === null
            ? 'no successful ingest run has ever been recorded.'
            : `last successful ingest was ${formatSyncAge(syncAgeMin)} (threshold: 2h). Check the cron/sync pipeline.`}
        </div>
      )}

      {dbError && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
          }}
        >
          DB read failed — showing empty stats. {dbError}
        </div>
      )}

      <section>
        <h2 style={sectionTitle}>Registry totals</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={card}>
            <div style={cardLabel}>Total models</div>
            <div style={cardValue}>{totalModels}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Providers</div>
            <div style={cardValue}>{providerCount}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Models w/ AA benchmarks</div>
            <div style={cardValue}>{aaBenchmarkModels}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              snapshots in last {SNAPSHOT_WINDOW_DAYS}d
            </div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Last successful sync</div>
            <div style={{ ...cardValue, color: stale ? '#fbbf24' : '#34d399' }}>
              {formatSyncAge(syncAgeMin)}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Models by status</h2>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Models</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(byStatus).length === 0 ? (
                <tr>
                  <td style={td} colSpan={2}>
                    <span style={{ color: '#64748b' }}>No models in registry.</span>
                  </td>
                </tr>
              ) : (
                Object.entries(byStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([status, count]) => (
                    <tr key={status}>
                      <td style={td}>{status}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {count}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Snapshot volume — last {SNAPSHOT_WINDOW_DAYS} days</h2>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Day (UTC)</th>
                <th style={{ ...th, textAlign: 'right' }}>Snapshots</th>
              </tr>
            </thead>
            <tbody>
              {volume.map((d) => (
                <tr key={d.date}>
                  <td style={{ ...td, fontFamily: 'monospace' }}>{d.date}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {d.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Ingest run history</h2>
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Time (UTC)</th>
                <th style={th}>Source</th>
                <th style={{ ...th, textAlign: 'right' }}>Payload</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td style={td} colSpan={4}>
                    <span style={{ color: '#64748b' }}>No ingest runs recorded.</span>
                  </td>
                </tr>
              ) : (
                runs.map((run, i) => (
                  <tr key={`${run.source}-${run.createdAt.toISOString()}-${i}`}>
                    <td style={{ ...td, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {run.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td style={td}>{run.source}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {run.payloadCount}
                    </td>
                    <td style={td}>{statusBadge(run.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
