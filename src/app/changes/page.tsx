import React from 'react';
import Link from 'next/link';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { computeChangeEvents, groupEventsByDay, ChangeEvent, ModelRow, SnapshotRow } from '@/lib/changes';
import { eq, gte } from 'drizzle-orm';

export const revalidate = 300; // 5 minutes

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
}

export default async function ChangesPage() {
  let events: ChangeEvent[] = [];

  if (process.env.DATABASE_URL && db) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

      events = computeChangeEvents(modelsList, snapshotsList, { days: 30 });
    } catch (err) {
      console.error('Error fetching changes data:', err);
    }
  }

  const grouped = groupEventsByDay(events);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Catalog Changes</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: 0 }}>
            Model additions, removals, and pricing updates tracked over the last 30 days.
          </p>
        </div>
        <Link
          href="/changes/rss.xml"
          target="_blank"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: '#1e293b',
            color: '#f97316',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: '1px solid #334155',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6.18" cy="17.82" r="2.18" />
            <path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z" />
          </svg>
          RSS 2.0 Feed
        </Link>
      </div>

      {grouped.length === 0 ? (
        <div style={{ backgroundColor: '#1e293b', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', color: '#94a3b8' }}>
          No catalog changes detected in the last 30 days.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {grouped.map((group) => (
            <section key={group.date}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#cbd5e1', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                {group.date}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {group.events.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {ev.type === 'new_model' && (
                          <span style={{ backgroundColor: '#065f46', color: '#34d399', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                            NEW MODEL
                          </span>
                        )}
                        {ev.type === 'removed_model' && (
                          <span style={{ backgroundColor: '#881337', color: '#f43f5e', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                            REMOVED
                          </span>
                        )}
                        {ev.type === 'price_change' && (
                          <span style={{ backgroundColor: '#1e3a8a', color: '#60a5fa', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                            PRICE CHANGE
                          </span>
                        )}
                        <Link
                          href={`/models/${ev.providerSlug || 'all'}/${ev.modelSlug}`}
                          style={{ fontSize: '1rem', fontWeight: 600, color: '#38bdf8', textDecoration: 'none' }}
                        >
                          {ev.modelName}
                        </Link>
                        {ev.providerName && (
                          <span style={{ fontSize: '0.875rem', color: '#64748b' }}>by {ev.providerName}</span>
                        )}
                      </div>
                      <time style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>

                    <div style={{ fontSize: '0.875rem', color: '#cbd5e1' }}>
                      {ev.type === 'new_model' && (
                        <span>Initial price: <strong>${ev.initialInputPrice}/1M in</strong> &bull; <strong>${ev.initialOutputPrice}/1M out</strong></span>
                      )}
                      {ev.type === 'removed_model' && (
                        <span>Model marked unavailable or discontinued.</span>
                      )}
                      {ev.type === 'price_change' && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          {ev.oldInputPrice !== ev.newInputPrice && (
                            <div>
                              Input price: <span style={{ textDecoration: 'line-through', color: '#64748b' }}>${ev.oldInputPrice}</span> &rarr; <strong style={{ color: ev.inputPriceChangePercent < 0 ? '#4ade80' : '#f87171' }}>${ev.newInputPrice}</strong>/1M ({ev.inputPriceChangePercent > 0 ? '+' : ''}{ev.inputPriceChangePercent}%)
                            </div>
                          )}
                          {ev.oldOutputPrice !== ev.newOutputPrice && (
                            <div>
                              Output price: <span style={{ textDecoration: 'line-through', color: '#64748b' }}>${ev.oldOutputPrice}</span> &rarr; <strong style={{ color: ev.outputPriceChangePercent < 0 ? '#4ade80' : '#f87171' }}>${ev.newOutputPrice}</strong>/1M ({ev.outputPriceChangePercent > 0 ? '+' : ''}{ev.outputPriceChangePercent}%)
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
