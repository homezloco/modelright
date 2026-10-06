import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { computeChangeEvents, generateRssXml } from '@/lib/changes';
import { gte } from 'drizzle-orm';

export const revalidate = 300;

interface ProviderRow {
  id: string;
  slug: string;
  name: string;
}

export async function GET() {
  let events = [];

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
      console.error('Failed to query catalog events for RSS:', err);
    }
  }

  const xml = generateRssXml(events, 'https://modelright.ai');

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate',
    },
  });
}
