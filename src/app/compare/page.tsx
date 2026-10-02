import Link from 'next/link';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams: {
    a?: string;
    b?: string;
  };
}

interface ModelItem {
  id: string;
  name: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  status: string;
  lastSeenAt: Date | null;
  updatedAt: Date;
  providerName: string;
  providerSlug: string;
  slug: string;
}

function parseModelParam(param?: string) {
  if (!param) return null;
  const parts = param.split('/');
  if (parts.length !== 2) return null;
  const [provider, slug] = parts;
  if (!provider || !slug) return null;
  return { provider: provider.toLowerCase(), slug: slug.toLowerCase() };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  let allModels: ModelItem[] = [];

  try {
    const results = await db
      .select({
        id: models.id,
        name: models.name,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        modalityTags: models.modalityTags,
        status: models.status,
        lastSeenAt: models.lastSeenAt,
        updatedAt: models.updatedAt,
        providerName: providers.name,
        providerSlug: providers.slug,
        slug: models.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .orderBy(asc(providers.name), asc(models.name));

    allModels = results.map((r: ModelItem) => ({
      ...r,
      modalityTags: r.modalityTags || [],
    }));
  } catch (error) {
    console.error('Failed to load models for compare page:', error);
  }

  const modelAKey = parseModelParam(searchParams.a);
  const modelBKey = parseModelParam(searchParams.b);

  const modelA = modelAKey
    ? allModels.find(
        (m: ModelItem) =>
          m.providerSlug.toLowerCase() === modelAKey.provider &&
          m.slug.toLowerCase() === modelAKey.slug
      )
    : null;

  const modelB = modelBKey
    ? allModels.find(
        (m: ModelItem) =>
          m.providerSlug.toLowerCase() === modelBKey.provider &&
          m.slug.toLowerCase() === modelBKey.slug
      )
    : null;

  const showComparison = modelA && modelB;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Compare Models</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Compare specifications, pricing, and capabilities side-by-side across AI model providers.
      </p>

      {showComparison ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/compare" style={{ color: '#0066cc', textDecoration: 'none' }}>
              ← Reset comparison / Pick different models
            </Link>
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #e5e7eb',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', width: '30%' }}>Spec / Metric</th>
                <th style={{ padding: '0.75rem 1rem', width: '35%' }}>{modelA.name} ({modelA.providerName})</th>
                <th style={{ padding: '0.75rem 1rem', width: '35%' }}>{modelB.name} ({modelB.providerName})</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Provider</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.providerName}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.providerName}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Slug</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.slug}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.slug}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Window</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.contextWindow.toLocaleString()} tokens</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.contextWindow.toLocaleString()} tokens</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Input Price (per 1M)</td>
                <td style={{ padding: '0.75rem 1rem' }}>${Number(modelA.inputPricePerM).toFixed(4)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>${Number(modelB.inputPricePerM).toFixed(4)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Output Price (per 1M)</td>
                <td style={{ padding: '0.75rem 1rem' }}>${Number(modelA.outputPricePerM).toFixed(4)}</td>
                <td style={{ padding: '0.75rem 1rem' }}>${Number(modelB.outputPricePerM).toFixed(4)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Modalities</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.modalityTags.length > 0 ? modelA.modalityTags.join(', ') : 'text'}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.modalityTags.length > 0 ? modelB.modalityTags.join(', ') : 'text'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Availability Status</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      marginRight: '0.5rem',
                      backgroundColor:
                        modelA.status === 'ok'
                          ? '#10b981'
                          : modelA.status === 'degraded'
                          ? '#f59e0b'
                          : '#9ca3af',
                    }}
                  />
                  {modelA.status}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      marginRight: '0.5rem',
                      backgroundColor:
                        modelB.status === 'ok'
                          ? '#10b981'
                          : modelB.status === 'degraded'
                          ? '#f59e0b'
                          : '#9ca3af',
                    }}
                  />
                  {modelB.status}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Last Snapshot Date</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {modelA.lastSeenAt
                    ? new Date(modelA.lastSeenAt).toISOString().split('T')[0]
                    : new Date(modelA.updatedAt).toISOString().split('T')[0]}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {modelB.lastSeenAt
                    ? new Date(modelB.lastSeenAt).toISOString().split('T')[0]
                    : new Date(modelB.updatedAt).toISOString().split('T')[0]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Select Models to Compare</h2>
          {(searchParams.a || searchParams.b) && (!modelA || !modelB) && (
            <p style={{ color: '#d97706', fontSize: '0.9rem', marginBottom: '1rem' }}>
              One or both requested models could not be found in the database. Please pick valid models from below.
            </p>
          )}

          {allModels.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preset Comparisons</h3>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                {allModels.length >= 2 && (
                  <li>
                    <Link
                      href={`/compare?a=${allModels[0].providerSlug}/${allModels[0].slug}&b=${allModels[1].providerSlug}/${allModels[1].slug}`}
                      style={{ color: '#0066cc' }}
                    >
                      {allModels[0].providerName} {allModels[0].name} vs {allModels[1].providerName} {allModels[1].name}
                    </Link>
                  </li>
                )}
                {allModels.length >= 3 && (
                  <li>
                    <Link
                      href={`/compare?a=${allModels[0].providerSlug}/${allModels[0].slug}&b=${allModels[2].providerSlug}/${allModels[2].slug}`}
                      style={{ color: '#0066cc' }}
                    >
                      {allModels[0].providerName} {allModels[0].name} vs {allModels[2].providerName} {allModels[2].name}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Available Models</h3>
            {allModels.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No models available in the database.</p>
            ) : (
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                {allModels.map((model) => (
                  <li key={model.id}>
                    <strong>{model.name}</strong> ({model.providerName}/{model.slug})
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
