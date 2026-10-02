import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { ilike, or, eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  if (!process.env.DATABASE_URL) {
    // Return mock results if DB is not configured (e.g., build time)
    const mockModels = [
      { name: 'GPT-4o', slug: 'gpt-4o', providerName: 'OpenAI', providerSlug: 'openai' },
      { name: 'GPT-4o mini', slug: 'gpt-4o-mini', providerName: 'OpenAI', providerSlug: 'openai' },
      { name: 'Claude 3.5 Sonnet', slug: 'claude-3-5-sonnet', providerName: 'Anthropic', providerSlug: 'anthropic' },
    ];
    const filtered = mockModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.providerName.toLowerCase().includes(q.toLowerCase()) ||
        m.slug.toLowerCase().includes(q.toLowerCase())
    );
    return NextResponse.json({ results: filtered });
  }

  try {
    const searchPattern = `%${q}%`;

    const results = await db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        providerName: providers.name,
        providerSlug: providers.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(
        or(
          ilike(models.name, searchPattern),
          ilike(models.slug, searchPattern),
          ilike(providers.name, searchPattern),
          ilike(providers.slug, searchPattern)
        )
      )
      .limit(10);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching models:', error);
    return NextResponse.json({ error: 'Failed to search models' }, { status: 500 });
  }
}
