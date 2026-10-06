import React from 'react';
import Link from 'next/link';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { computeChangeEvents, groupEventsByDay, ChangeEvent } from '@/lib/changes';
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

      const providerMap = new Map<string, ProviderRow>(allProviders.map((p) => [p.id, p]));

      const rawModels = await db.select().from(models);
      const modelsList = rawModels.map((m) => {
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

      const rawSnapshots = await db
        .select()
        .from(modelSnapshots)
        .where(gte(modelSnapshots.capturedAt, thirtyDaysAgo));

      const snapshotList = rawSnapshots.map((s) => ({
        id: s.id,
        modelId: s.modelId,
        capturedAt: s.capturedAt,
        availability: s.availability,
        inputPricePerM: s.inputPricePerM,
        outputPricePerM: s.outputPricePerM,
      }));

      events = computeChangeEvents(modelsList, snapshotList, 30);
    } catch (err) {
      console.error('Failed to query catalog events:', err);
    }
  }

  const grouped = groupEventsByDay(events);

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '900px', margin: '0 auto', color: '#f8fafc' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
            Catalog Changes
          </h1>
          <p style={{ color: '#94a3b8', margin: '0.5rem 0 0 0', fontSize: '1rem' }}>
            Model releases, price adjustments, and catalog updates over the last 30 days.
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
            color: '#38bdf8',
            border: '1px solid #334155',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9" />
            <path d="M4 4a16 16 0 0 1 16 16" />
            <circle cx="5" cy="19" r="1" />
          </svg>
          RSS Feed
        </Link>
      </div>

      {grouped.length === 0 ? (
        <div style={{ backgroundColor: '#1e293b', padding: '3rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '1.125rem', margin: 0 }}>
            No catalog events recorded in the last 30 days.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {grouped.map(({ date, events: dayEvents }) => (
            <section key={date}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#38bdf8', borderBottom: '1px solid #334155', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                {date}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.5rem',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          backgroundColor:
                            ev.type === 'new_model'
                              ? 'rgba(34, 197, 94, 0.2)'
                              : ev.type === 'price_change'
                              ? 'rgba(234, 179, 8, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                          color:
                            ev.type === 'new_model'
                              ? '#4ade80'
                              : ev.type === 'price_change'
                              ? '#facc15'
                              : '#f87171',
                          border: `1px solid ${
                            ev.type === 'new_model'
                              ? '#166534'
                              : ev.type === 'price_change'
                              ? '#854d0e'
                              : '#991b1b'
                          }`,
                        }}
                      >
                        {ev.type === 'new_model'
                          ? 'New Model'
                          : ev.type === 'price_change'
                          ? 'Price Change'
                          : 'Removed'}
                      </span>
                      <Link
                        href={`/models/${ev.modelSlug}`}
                        style={{ color: '#f8fafc', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {ev.providerName ? `${ev.providerName} / ` : ''}
                        {ev.modelName}
                      </Link>
                    </div>

                    <div style={{ color: '#94a3b8', fontSize: '0.875rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {ev.type === 'new_model' && (
                        <span>
                          Initial: ${ev.initialInputPrice}/M in, ${ev.initialOutputPrice}/M out
                        </span>
                      )}
                      {ev.type === 'price_change' && (
                        <div>
                          {ev.oldInputPrice !== ev.newInputPrice && (
                            <div>
                              In: ${ev.oldInputPrice} &rarr; ${ev.newInputPrice} ({ev.inputPriceChangePercent > 0 ? '+' : ''}{ev.inputPriceChangePercent}%)
                            </div>
                          )}
                          {ev.oldOutputPrice !== ev.newOutputPrice && (
                            <div>
                              Out: ${ev.oldOutputPrice} &rarr; ${ev.newOutputPrice} ({ev.outputPriceChangePercent > 0 ? '+' : ''}{ev.outputPriceChangePercent}%)
                            </div>
                          )}
                        </div>
                      )}
                      {ev.type === 'removed_model' && <span>Model no longer active</span>}
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
