import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, providers, modelSnapshots } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  API_CORS_HEADERS,
  API_CACHE_HEADERS,
  detailResponse,
} from '@/lib/v1-api';

export const dynamic = 'force-dynamic';

const HEADERS = { ...API_CORS_HEADERS, ...API_CACHE_HEADERS };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { provider: string; slug: string } }
) {
  try {
    const rows = await db
      .select({
        provider: providers.slug,
        slug: models.slug,
        name: models.name,
        providerName: providers.name,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        modalityTags: models.modalityTags,
        status: models.status,
        updatedAt: models.updatedAt,
        modelId: models.id,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(
        and(
          eq(sql`LOWER(${providers.slug})`, params.provider.toLowerCase()),
          eq(sql`LOWER(${models.slug})`, params.slug.toLowerCase())
        )
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'not_found' }, { status: 404, headers: HEADERS });
    }

    const snapshots = await db
      .select({
        capturedAt: modelSnapshots.capturedAt,
        availability: modelSnapshots.availability,
        inputPricePerM: modelSnapshots.inputPricePerM,
        outputPricePerM: modelSnapshots.outputPricePerM,
      })
      .from(modelSnapshots)
      .where(eq(modelSnapshots.modelId, row.modelId))
      .orderBy(desc(modelSnapshots.capturedAt))
      .limit(30);

    const { modelId, ...model } = row;
    return NextResponse.json(detailResponse(model, snapshots), { headers: HEADERS });
  } catch (error) {
    console.error('api/v1/models/[provider]/[slug] failed:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500, headers: HEADERS });
  }
}
