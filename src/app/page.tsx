import Link from 'next/link';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import {
  computeChangeEvents,
  deriveWeeklyMovers,
  earliestRegistryTimestamp,
  ChangeEvent,
  ModelRow,
  SnapshotRow,
  WeeklyMovers,
} from '@/lib/changes';
import { formatAge } from '@/lib/freshness';
import { gte } from 'drizzle-orm';

export const revalidate = 300; // 5 minutes

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
}

async function getWeeklyMovers(): Promise<WeeklyMovers | null> {
  if (!process.env.DATABASE_URL || !db) return null;

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allProviders: ProviderRow[] = await db.select({
      id: providers.id,
      slug: providers.slug,
      name: providers.name,
    }).from(providers);

    const providerMap = new Map<string, ProviderRow>(allProviders.map((p: ProviderRow) => [p.id, p]));

    const rawModels = await db.select().from(models);
    const modelsList: ModelRow[] = rawModels.map((m: Record<string, any>) => {
      const provider = m.providerId ? providerMap.get(m.providerId) : undefined;
      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        providerSlug: provider?.slug || '',
        providerName: provider?.name || 'Unknown',
        inputPricePerM: m.inputPricePerM,
        outputPricePerM: m.outputPricePerM,
        createdAt: m.createdAt,
      };
    });

    const rawSnapshots = await db.select().from(modelSnapshots).where(gte(modelSnapshots.capturedAt, thirtyDaysAgo));
    const snapshotsList: SnapshotRow[] = rawSnapshots.map((s: Record<string, any>) => ({
      id: s.id,
      modelId: s.modelId,
      capturedAt: s.capturedAt,
      availability: s.availability,
      inputPricePerM: s.inputPricePerM,
      outputPricePerM: s.outputPricePerM,
    }));

    // Hide gracefully while the registry has less than 7 days of history.
    const earliest = earliestRegistryTimestamp(modelsList, snapshotsList);
    if (!earliest || earliest.getTime() > now.getTime() - WEEK_MS) return null;

    const events: ChangeEvent[] = computeChangeEvents(modelsList, snapshotsList, { now, days: 7 });
    const movers = deriveWeeklyMovers(events, { now, days: 7 });
    if (movers.priceDrops.length === 0 && movers.newestModels.length === 0) return null;

    return movers;
  } catch (err) {
    console.error('Error computing homepage weekly movers:', err);
    return null;
  }
}

export default async function Home() {
  const movers = await getWeeklyMovers();

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <section style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Real-time AI Model Specs, Context Windows & Pricing
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto 2rem' }}>
          Modelright is a live registry tracking AI model specifications, context window sizes, and pricing per 1M tokens across top providers.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/models"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Explore Models &rarr;
          </Link>
          <Link
            href="/compare"
            style={{
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #334155'
            }}
          >
            Compare Side-by-Side
          </Link>
        </div>
      </section>

      {movers && (
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>This week</h2>
            <Link href="/changes" style={{ fontSize: '0.875rem', color: '#38bdf8', textDecoration: 'none' }}>
              All changes &rarr;
            </Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {movers.priceDrops.length > 0 && (
              <div style={{ padding: '1.5rem', border: '1px solid #334155', borderRadius: '0.5rem', backgroundColor: '#1e293b' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Biggest price drops
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {movers.priceDrops.map((m) => (
                    <li key={m.modelId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
                      <Link
                        href={`/models/${m.providerSlug || 'all'}/${m.modelSlug}`}
                        style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {m.modelName}
                      </Link>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#4ade80' }}>{m.percentChange}%</strong> {m.priceKind}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {movers.newestModels.length > 0 && (
              <div style={{ padding: '1.5rem', border: '1px solid #334155', borderRadius: '0.5rem', backgroundColor: '#1e293b' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Newest models
                </h3>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {movers.newestModels.map((m) => (
                    <li key={m.modelId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <Link
                          href={`/models/${m.providerSlug || 'all'}/${m.modelSlug}`}
                          style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}
                        >
                          {m.modelName}
                        </Link>
                        {m.providerName && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}> · {m.providerName}</span>
                        )}
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {formatAge(m.timestamp)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #334155', borderRadius: '0.5rem', backgroundColor: '#1e293b' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Live Registry</h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Continuously updated specs and per-million token pricing across LLMs and vision models.
          </p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #334155', borderRadius: '0.5rem', backgroundColor: '#1e293b' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automated Ingest Feed</h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Entries update automatically via provider ingest feeds and pricing/availability snapshots.
          </p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #334155', borderRadius: '0.5rem', backgroundColor: '#1e293b' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Freshness Tracking</h2>
          <p style={{ fontSize: '0.95rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Status indicators (OK, degraded, unknown) keep you informed on current provider availability.
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #334155', paddingTop: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        Built with Next.js 14 • Drizzle ORM • PostgreSQL
      </footer>
    </main>
  );
}
