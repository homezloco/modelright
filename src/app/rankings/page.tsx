import Link from 'next/link';
import { Metadata } from 'next';
import { db } from '@/db/client';
import { models, providers, modelSnapshots } from '@/db/schema';
import { eq, ne, desc, sql } from 'drizzle-orm';
import { extractAABenchmarksByModel } from '@/lib/aa-benchmarks';
import {
  buildLeaderboards,
  RANKING_DIMENSIONS,
  RankingModel,
  RankedRow,
} from '@/lib/rankings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rankings | Modelright',
  description:
    'AI model leaderboards ranked by Artificial Analysis benchmarks — intelligence index, coding index, output speed, and time to first token — joined to live per-1M-token pricing.',
};

async function getRankingModels(): Promise<RankingModel[]> {
  try {
    const modelRows = await db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        status: models.status,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        providerName: providers.name,
        providerSlug: providers.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(ne(models.status, 'removed'));

    if (modelRows.length === 0) return [];

    // Only snapshots carrying AA benchmark/speed fields can rank; newest
    // first so extractAABenchmarksByModel keeps each model's latest read.
    const snapshotRows = await db
      .select({
        modelId: modelSnapshots.modelId,
        rawPayload: modelSnapshots.rawPayload,
      })
      .from(modelSnapshots)
      .where(
        sql`(${modelSnapshots.rawPayload}::jsonb) ? 'benchmarks' OR (${modelSnapshots.rawPayload}::jsonb) ? 'speed'`
      )
      .orderBy(desc(modelSnapshots.capturedAt));

    const benchmarksByModel = extractAABenchmarksByModel(snapshotRows);

    return modelRows.map((m: any) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      status: m.status ?? 'unknown',
      providerName: m.providerName,
      providerSlug: m.providerSlug,
      inputPricePerM: m.inputPricePerM,
      outputPricePerM: m.outputPricePerM,
      benchmarks: benchmarksByModel.get(m.id) ?? null,
    }));
  } catch (err) {
    console.error('Failed to load ranking data:', err);
    return [];
  }
}

function LeaderboardTable({
  dimensionKey,
  rows,
}: {
  dimensionKey: keyof ReturnType<typeof buildLeaderboards>;
  rows: RankedRow[];
}) {
  const dim = RANKING_DIMENSIONS.find((d) => d.key === dimensionKey)!;
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
        {dim.title}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 0, marginBottom: '1rem' }}>
        {dim.blurb}
      </p>
      {rows.length === 0 ? (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            color: '#64748b',
            fontSize: '0.925rem',
          }}
        >
          No models carry this metric yet.
        </div>
      ) : (
        <div
          style={{
            overflowX: 'auto',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
            backgroundColor: '#1e293b',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.925rem',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid #334155',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Model</th>
                <th style={{ padding: '0.75rem 1rem' }}>Provider</th>
                <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                <th style={{ padding: '0.75rem 1rem' }}>$/1M In</th>
                <th style={{ padding: '0.75rem 1rem' }}>$/1M Out</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.modelId}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#1e293b' : '#23304a',
                    borderBottom:
                      idx < rows.length - 1 ? '1px solid #334155' : 'none',
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#64748b' }}>
                    #{row.rank}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                    <Link
                      href={`/models/${row.providerSlug}/${row.modelSlug}`}
                      style={{ color: '#38bdf8', textDecoration: 'none' }}
                    >
                      {row.modelName}
                    </Link>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>{row.providerName}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 600 }}>
                    {dim.format(row.score)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {row.inputPricePerM === null ? '—' : `$${row.inputPricePerM.toFixed(2)}`}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#cbd5e1' }}>
                    {row.outputPricePerM === null ? '—' : `$${row.outputPricePerM.toFixed(2)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function RankingsPage() {
  const rankingModels = await getRankingModels();
  const boards = buildLeaderboards(rankingModels);
  const totalRanked = RANKING_DIMENSIONS.reduce((n, d) => n + boards[d.key].length, 0);

  return (
    <main
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: '2rem 1rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
          Rankings
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.5, margin: 0 }}>
          Models ranked by Artificial Analysis benchmark snapshots, shown alongside live registry
          pricing — the smartest-per-dollar context pure leaderboards lack. Only models carrying
          benchmark data rank.
        </p>
      </header>

      {totalRanked === 0 ? (
        <div
          style={{
            padding: '3rem 1rem',
            textAlign: 'center',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '0.5rem',
          }}
        >
          <p style={{ color: '#94a3b8', fontSize: '1.05rem', marginTop: 0 }}>
            No benchmark data yet.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 0 }}>
            Leaderboards appear once the Artificial Analysis enrichment sync records benchmark
            snapshots. Browse the <Link href="/models" style={{ color: '#38bdf8' }}>model catalog</Link>{' '}
            in the meantime.
          </p>
        </div>
      ) : (
        RANKING_DIMENSIONS.map((dim) => (
          <LeaderboardTable key={dim.key} dimensionKey={dim.key} rows={boards[dim.key]} />
        ))
      )}

      <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem' }}>
        Benchmark data:{' '}
        <a href="https://artificialanalysis.ai" style={{ color: '#38bdf8' }}>
          Artificial Analysis
        </a>
        {' '}· prices are USD per 1M tokens from the live registry.
      </p>
    </main>
  );
}
