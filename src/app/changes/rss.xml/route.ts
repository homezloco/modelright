import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { computeChangeEvents, generateRssFeed, ChangeEvent, ModelRow, SnapshotRow } from '@/lib/changes';
import { gte } from 'drizzle-orm';

export const revalidate = 300; // 5 minutes

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
}

export async function GET() {
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
      console.error('Error computing changes for RSS feed:', err);
    }
  }

  const xml = generateRssFeed(events);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
    },
  });
}
