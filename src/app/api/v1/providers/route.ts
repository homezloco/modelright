import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { asc, count, eq, sql } from 'drizzle-orm';
import {
  API_CORS_HEADERS,
  API_CACHE_HEADERS,
  providersResponse,
} from '@/lib/v1-api';

export const dynamic = 'force-dynamic';

const HEADERS = { ...API_CORS_HEADERS, ...API_CACHE_HEADERS };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET() {
  try {
    const rows = await db
      .select({
        slug: providers.slug,
        name: providers.name,
        modelCount: count(models.id),
        minInputPricePerM: sql<string | null>`min(${models.inputPricePerM})::float`,
        maxInputPricePerM: sql<string | null>`max(${models.inputPricePerM})::float`,
      })
      .from(providers)
      .leftJoin(models, eq(models.providerId, providers.id))
      .groupBy(providers.id, providers.slug, providers.name)
      .orderBy(asc(providers.name));

    return NextResponse.json(providersResponse(rows), { headers: HEADERS });
  } catch (error) {
    console.error('api/v1/providers failed:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500, headers: HEADERS });
  }
}
