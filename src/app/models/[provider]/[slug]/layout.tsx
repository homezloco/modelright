import { Metadata } from 'next';
import { db } from '@/db/client';
import { providers, models } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface Props {
  params: Promise<{
    provider: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const { provider, slug } = resolvedParams;

  let modelName = slug;
  let providerName = provider;

  try {
    const result = await db
      .select({
        modelName: models.name,
        providerName: providers.name,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(and(eq(providers.slug, provider), eq(models.slug, slug)))
      .limit(1);

    if (result.length > 0) {
      modelName = result[0].modelName;
      providerName = result[0].providerName;
    } else {
      // Capitalize slug words if fallback
      modelName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
      providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  } catch {
    modelName = slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
  }

  const title = `${modelName} (${providerName}) | modelright`;
  const description = `Specs, pricing, and availability history for ${modelName} by ${providerName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default function ModelDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
