import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, modelSnapshots, providers } from '@/db/schema';
import { gte } from 'drizzle-orm';
import { computeChangeEvents, ModelRow, SnapshotRow } from '@/lib/changes';
import {
  API_CORS_HEADERS,
  API_CACHE_HEADERS,
  changesResponse,
} from '@/lib/v1-api';

export const dynamic = 'force-dynamic';

const HEADERS = { ...API_CORS_HEADERS, ...API_CACHE_HEADERS };
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const rawDays = parseInt(request.nextUrl.searchParams.get('days') || '', 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, MAX_DAYS) : DEFAULT_DAYS;

  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    interface ProviderRow {
      id: string;
      slug: string;
      name: string;
    }
    const providerRows: ProviderRow[] = await db
      .select({ id: providers.id, slug: providers.slug, name: providers.name })
      .from(providers);
    const providerMap = new Map<string, ProviderRow>(providerRows.map((p: ProviderRow) => [p.id, p]));

    const modelRows = await db.select().from(models);
    const modelsList: ModelRow[] = modelRows.map((m: Record<string, any>) => {
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

    const snapshotRows = await db
      .select()
      .from(modelSnapshots)
      .where(gte(modelSnapshots.capturedAt, cutoff));
    const snapshotsList: SnapshotRow[] = snapshotRows.map((s: Record<string, any>) => ({
      id: s.id,
      modelId: s.modelId,
      capturedAt: s.capturedAt,
      availability: s.availability,
      inputPricePerM: s.inputPricePerM,
      outputPricePerM: s.outputPricePerM,
    }));

    const events = computeChangeEvents(modelsList, snapshotsList, { days });
    return NextResponse.json(changesResponse(events, days), { headers: HEADERS });
  } catch (error) {
    console.error('api/v1/changes failed:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500, headers: HEADERS });
  }
}
