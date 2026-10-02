import { MetadataRoute } from 'next';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://modelright.org';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/models`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  let modelRoutes: MetadataRoute.Sitemap = [];

  try {
    const modelList = await db
      .select({
        providerSlug: providers.slug,
        modelSlug: models.slug,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id));

    modelRoutes = modelList.map((m: { providerSlug: string; modelSlug: string; updatedAt: Date }) => ({
      url: `${baseUrl}/models/${m.providerSlug}/${m.modelSlug}`,
      lastModified: m.updatedAt ? new Date(m.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));
  } catch (error) {
    console.error('Failed to generate sitemap model routes:', error);
  }

  return [...staticRoutes, ...modelRoutes];
}
