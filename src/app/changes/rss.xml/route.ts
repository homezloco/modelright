import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { desc, gte } from 'drizzle-orm';
import { computeChangeEvents, generateRssFeed } from '@/lib/changes';

export const revalidate = 3600;

export async function GET() {
  let events: ReturnType<typeof computeChangeEvents> = [];

  if (db) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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

      events = computeChangeEvents(modelRows, snapshotRows, { days: 30 });
    } catch (e) {
      console.error('Failed to generate RSS feed:', e);
    }
  }

  const xml = generateRssFeed(events);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
