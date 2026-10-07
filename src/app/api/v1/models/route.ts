import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc, desc, count } from 'drizzle-orm';
import { buildModelWhereClause } from '@/lib/filters';
import {
  API_CORS_HEADERS,
  API_CACHE_HEADERS,
  parseApiListParams,
  listResponse,
} from '@/lib/v1-api';

export const dynamic = 'force-dynamic';

const HEADERS = { ...API_CORS_HEADERS, ...API_CACHE_HEADERS };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const { filters, sort, page, limit } = parseApiListParams(params);

  const whereClause = buildModelWhereClause(filters);

  let orderByClause;
  if (sort === 'price_in') {
    orderByClause = [asc(models.inputPricePerM), asc(models.name)];
  } else if (sort === 'price_in_desc') {
    orderByClause = [desc(models.inputPricePerM), asc(models.name)];
  } else if (sort === 'price_out') {
    orderByClause = [asc(models.outputPricePerM), asc(models.name)];
  } else if (sort === 'price_out_desc') {
    orderByClause = [desc(models.outputPricePerM), asc(models.name)];
  } else if (sort === 'name') {
    orderByClause = [asc(models.name)];
  } else {
    orderByClause = [asc(providers.name), asc(models.name)];
  }

  try {
    const countResult = await db
      .select({ value: count() })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(whereClause);
    const total = Number(countResult[0]?.value || 0);

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
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(limit)
      .offset((page - 1) * limit);

    return NextResponse.json(listResponse(rows, total, page, limit), { headers: HEADERS });
  } catch (error) {
    console.error('api/v1/models failed:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500, headers: HEADERS });
  }
}
