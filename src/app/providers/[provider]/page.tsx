import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { providers, models } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ProviderDetailPageProps {
  params: {
    provider: string;
  };
}


async function getProviderData(providerSlug: string) {
  try {
    const providerList = await db
      .select()
      .from(providers)
      .where(eq(providers.slug, providerSlug))
      .limit(1);

    if (providerList.length === 0) {
      return null;
    }

    const providerRec = providerList[0];

    const modelList = await db
      .select({
        name: models.name,
        slug: models.slug,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        status: models.status,
      })
      .from(models)
      .where(eq(models.providerId, providerRec.id))
      .orderBy(asc(models.name));

    return {
      name: providerRec.name,
      slug: providerRec.slug,
      modelsCount: modelList.length,
      models: modelList.map((m: typeof models.$inferSelect) => ({
        name: m.name,
        slug: m.slug,
        contextWindow: m.contextWindow,
        inputPricePerM: `$${Number(m.inputPricePerM).toFixed(2)}`,
        outputPricePerM: `$${Number(m.outputPricePerM).toFixed(2)}`,
        status: m.status,
      })),
    };
  } catch (error) {
    return null;
  }
}

export default async function ProviderDetailPage({ params }: ProviderDetailPageProps) {
  const providerData = await getProviderData(params.provider);

  if (!providerData) {
    notFound();
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/providers" style={{ color: '#38bdf8', textDecoration: 'none' }}>
          ← Back to Providers
        </Link>
      </div>

      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #1e293b', paddingBottom: '1rem' }}>
        <h1 style={{ fontSize: '2rem', marginTop: 0, marginBottom: '0.5rem', color: '#f8fafc' }}>
          {providerData.name}
        </h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>
          Provider slug: <code style={{ backgroundColor: '#1e293b', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{providerData.slug}</code>
          {' · '}
          {providerData.modelsCount} {providerData.modelsCount === 1 ? 'model' : 'models'} available
        </p>
      </header>

      <section>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#f8fafc' }}>Models Catalog</h2>
        {providerData.models.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>No models registered for this provider yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #334155', color: '#94a3b8', fontSize: '0.875rem' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Model Name</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Context Window</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Input / 1M</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Output / 1M</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {providerData.models.map((m: any) => (
                  <tr key={m.slug} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 500 }}>
                      <Link
                        href={`/models/${providerData.slug}/${m.slug}`}
                        style={{ color: '#38bdf8', textDecoration: 'none' }}
                      >
                        {m.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                      {m.contextWindow.toLocaleString()} tokens
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                      {m.inputPricePerM}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#cbd5e1' }}>
                      {m.outputPricePerM}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: m.status === 'available' || m.status === 'ok' ? '#14532d' : '#7f1d1d',
                          color: m.status === 'available' || m.status === 'ok' ? '#86efac' : '#fca5a5',
                        }}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <Link
                        href={`/models/${providerData.slug}/${m.slug}`}
                        style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.875rem' }}
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
