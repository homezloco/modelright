import { MetadataRoute } from 'next';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildVsPairs } from '@/lib/compare';
import { AGENT_SURFACE } from '@/lib/agent-surface';
import { TASK_RULES, TaskCategory } from '@/lib/picks';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = AGENT_SURFACE.baseUrl;

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
      url: `${baseUrl}/providers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/compare`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/pick`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/changes`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/api`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/calculator`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];

  const taskRoutes: MetadataRoute.Sitemap = (Object.keys(TASK_RULES) as TaskCategory[]).map(
    (task) => ({
      url: `${baseUrl}/pick/${task}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })
  );

  let modelRoutes: MetadataRoute.Sitemap = [];
  let providerRoutes: MetadataRoute.Sitemap = [];
  let pairRoutes: MetadataRoute.Sitemap = [];

  try {
    const providerList = await db
      .select({
        slug: providers.slug,
        updatedAt: providers.updatedAt,
      })
      .from(providers);

    providerRoutes = providerList.map((p: { slug: string; updatedAt: Date | null }) => ({
      url: `${baseUrl}/providers/${p.slug}`,
      lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    }));

    const modelList = await db
      .select({
        providerSlug: providers.slug,
        modelSlug: models.slug,
        inputPricePerM: models.inputPricePerM,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id));

    modelRoutes = modelList.map((m: { providerSlug: string; modelSlug: string; updatedAt: Date | null }) => ({
      url: `${baseUrl}/models/${m.providerSlug}/${m.modelSlug}`,
      lastModified: m.updatedAt ? new Date(m.updatedAt) : new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    }));

    pairRoutes = buildVsPairs(
      modelList.map((m: { providerSlug: string; modelSlug: string; inputPricePerM: string; updatedAt: Date | null }) => ({
        providerSlug: m.providerSlug,
        slug: m.modelSlug,
        inputPricePerM: m.inputPricePerM,
        updatedAt: m.updatedAt,
      })),
      { recentCount: 30, maxPairs: 60 }
    ).map((path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    console.error('Failed to generate sitemap routes:', error);
  }

  return [...staticRoutes, ...taskRoutes, ...providerRoutes, ...modelRoutes, ...pairRoutes];
}
