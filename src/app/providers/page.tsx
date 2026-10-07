import Link from 'next/link';
import { db } from '@/db/client';
import { providers, models } from '@/db/schema';
import { eq, asc, count, min, max } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ProviderSummary {
  name: string;
  slug: string;
  modelCount: number;
  minInputPrice: string | null;
  maxInputPrice: string | null;
}

async function getProvidersList(): Promise<ProviderSummary[]> {
  try {
    const list = await db
      .select({
        name: providers.name,
        slug: providers.slug,
        modelCount: count(models.id),
        minInputPrice: min(models.inputPricePerM),
        maxInputPrice: max(models.inputPricePerM),
      })
      .from(providers)
      .leftJoin(models, eq(providers.id, models.providerId))
      .groupBy(providers.id, providers.name, providers.slug)
      .orderBy(asc(providers.name));

    return list.map((p: { name: string; slug: string; modelCount: unknown; minInputPrice: string | null; maxInputPrice: string | null }) => ({
      name: p.name,
      slug: p.slug,
      modelCount: Number(p.modelCount),
      minInputPrice: p.minInputPrice,
      maxInputPrice: p.maxInputPrice,
    }));
  } catch {
    return [];
  }
}

export default async function ProvidersIndexPage() {
  const providerList = await getProvidersList();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginTop: 0, marginBottom: '0.5rem', color: '#f8fafc' }}>
          AI Model Providers
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Browse artificial intelligence model providers and their hosted catalog offerings.
        </p>
      </header>

      {providerList.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No providers registered yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {providerList.map((provider) => (
            <div
              key={provider.slug}
              style={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '8px',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.5rem', color: '#f8fafc' }}>
                  {provider.name}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                  {provider.modelCount} {provider.modelCount === 1 ? 'model' : 'models'} available
                </p>
                {provider.minInputPrice !== null && (
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                    Input ${Number(provider.minInputPrice).toFixed(2)} – ${Number(provider.maxInputPrice).toFixed(2)} /1M
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <Link
                  href={`/providers/${provider.slug}`}
                  style={{
                    color: '#38bdf8',
                    textDecoration: 'none',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                  }}
                >
                  View Catalog →
                </Link>

                <Link
                  href={`/models?provider=${provider.slug}`}
                  style={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                  }}
                >
                  Filter Index
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
