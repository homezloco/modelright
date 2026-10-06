import Link from 'next/link';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { eq, desc, gte } from 'drizzle-orm';
import { computeChangeEvents, groupEventsByDay, ChangeEvent } from '@/lib/changes';

export const revalidate = 3600;

async function getChangesData() {
  if (!db) {
    return [];
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  try {
    const allProviders = await db.select().from(providers);
    const providerMap = new Map(allProviders.map((p) => [p.id, p]));

    const rawModels = await db.select().from(models);
    const modelRows = rawModels.map((m) => {
      const p = providerMap.get(m.providerId);
      return {
        id: m.id,
        name: m.name,
        slug: m.slug,
        providerSlug: p?.slug,
        providerName: p?.name,
        inputPricePerM: m.inputPricePerM,
        outputPricePerM: m.outputPricePerM,
        createdAt: m.createdAt,
      };
    });

    const rawSnapshots = await db
      .select()
      .from(modelSnapshots)
      .where(gte(modelSnapshots.capturedAt, thirtyDaysAgo))
      .orderBy(desc(modelSnapshots.capturedAt));

    const snapshotRows = rawSnapshots.map((s) => ({
      id: s.id,
      modelId: s.modelId,
      capturedAt: s.capturedAt,
      availability: s.availability,
      inputPricePerM: s.inputPricePerM,
      outputPricePerM: s.outputPricePerM,
    }));

    return computeChangeEvents(modelRows, snapshotRows, { days: 30 });
  } catch (e) {
    console.error('Failed to fetch changes data:', e);
    return [];
  }
}

export default async function ChangesPage() {
  const events = await getChangesData();
  const grouped = groupEventsByDay(events);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
            Catalog Changes
          </h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>
            Model additions, price changes, and deprecations over the last 30 days.
          </p>
        </div>
        <Link
          href="/changes/rss.xml"
          target="_blank"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#1e293b',
            color: '#f59e0b',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: '1px solid #334155',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          RSS Feed
        </Link>
      </div>

      {grouped.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: '#1e293b', borderRadius: '0.5rem', border: '1px solid #334155', color: '#94a3b8' }}>
          No catalog changes recorded in the last 30 days.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {grouped.map((group) => (
            <section key={group.date}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                {group.date}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {group.events.map((ev) => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: ChangeEvent }) {
  const modelUrl = `/models/${event.providerSlug || 'all'}/${event.modelSlug}`;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '0.5rem',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Badge type={event.type} />
          <Link href={modelUrl} style={{ fontWeight: 600, color: '#f8fafc', textDecoration: 'none' }}>
            {event.modelName}
          </Link>
          {event.providerName && (
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              by {event.providerName}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          {event.type === 'new_model' && (
            <span>
              Initial pricing: ${event.initialInputPrice}/1M in, ${event.initialOutputPrice}/1M out
            </span>
          )}
          {event.type === 'removed_model' && (
            <span style={{ color: '#f87171' }}>
              Model marked unavailable or removed from catalog
            </span>
          )}
          {event.type === 'price_change' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              {event.oldInputPrice !== event.newInputPrice && (
                <span>
                  Input: ${event.oldInputPrice} → ${event.newInputPrice}{' '}
                  <span style={{ color: event.inputPriceChangePercent <= 0 ? '#4ade80' : '#f87171' }}>
                    ({event.inputPriceChangePercent > 0 ? '+' : ''}{event.inputPriceChangePercent}%)
                  </span>
                </span>
              )}
              {event.oldOutputPrice !== event.newOutputPrice && (
                <span>
                  Output: ${event.oldOutputPrice} → ${event.newOutputPrice}{' '}
                  <span style={{ color: event.outputPriceChangePercent <= 0 ? '#4ade80' : '#f87171' }}>
                    ({event.outputPriceChangePercent > 0 ? '+' : ''}{event.outputPriceChangePercent}%)
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#64748b', whitespace: 'nowrap' }}>
        {event.timestamp.toISOString().split('T')[1].slice(0, 5)} UTC
      </div>
    </div>
  );
}

function Badge({ type }: { type: ChangeEvent['type'] }) {
  let label = '';
  let bgColor = '';
  let textColor = '';

  if (type === 'new_model') {
    label = 'NEW';
    bgColor = '#065f46';
    textColor = '#34d399';
  } else if (type === 'price_change') {
    label = 'PRICE';
    bgColor = '#1e3a8a';
    textColor = '#60a5fa';
  } else {
    label = 'REMOVED';
    bgColor = '#7f1d1d';
    textColor = '#f87171';
  }

  return (
    <span
      style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        padding: '0.125rem 0.5rem',
        borderRadius: '0.25rem',
        backgroundColor: bgColor,
        color: textColor,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
  );
}
