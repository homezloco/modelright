import Link from 'next/link';
import { db } from '@/db/client';
import { models, providers, modelSnapshots } from '@/db/schema';
import { eq, asc, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams?: Promise<{
    a?: string;
    b?: string;
  }> | {
    a?: string;
    b?: string;
  };
}

interface DBModelItem {
  id: string;
  providerSlug: string;
  providerName: string;
  slug: string;
  name: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  status: string;
  updatedAt: Date;
  lastSnapshotDate: Date | null;
}

function parseModelParam(param?: string) {
  if (!param) return null;
  const parts = param.split('/');
  if (parts.length !== 2) return null;
  const [provider, slug] = parts;
  if (!provider || !slug) return null;
  return { provider: provider.toLowerCase(), slug: slug.toLowerCase() };
}

export default async function ComparePage(props: ComparePageProps) {
  const resolvedSearchParams = await Promise.resolve(props.searchParams);
  const paramA = resolvedSearchParams?.a;
  const paramB = resolvedSearchParams?.b;

  const modelAKey = parseModelParam(paramA);
  const modelBKey = parseModelParam(paramB);

  let allModels: DBModelItem[] = [];

  try {
    const results = await db
      .select({
        id: models.id,
        providerSlug: providers.slug,
        providerName: providers.name,
        slug: models.slug,
        name: models.name,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        modalityTags: models.modalityTags,
        status: models.status,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .orderBy(asc(providers.name), asc(models.name));

    // Fetch latest snapshot dates for each model
    const snapshotsList = await db
      .select({
        modelId: modelSnapshots.modelId,
        capturedAt: modelSnapshots.capturedAt,
      })
      .from(modelSnapshots)
      .orderBy(desc(modelSnapshots.capturedAt));

    const latestSnapshotMap = new Map<string, Date>();
    for (const snap of snapshotsList) {
      if (!latestSnapshotMap.has(snap.modelId)) {
        latestSnapshotMap.set(snap.modelId, snap.capturedAt);
      }
    }

    allModels = results.map((m) => ({
      ...m,
      lastSnapshotDate: latestSnapshotMap.get(m.id) || null,
    }));
  } catch (error) {
    console.error('Failed to load models for compare page:', error);
  }

  const modelA = modelAKey
    ? allModels.find(
        (m) =>
          m.providerSlug.toLowerCase() === modelAKey.provider &&
          m.slug.toLowerCase() === modelAKey.slug
      )
    : null;

  const modelB = modelBKey
    ? allModels.find(
        (m) =>
          m.providerSlug.toLowerCase() === modelBKey.provider &&
          m.slug.toLowerCase() === modelBKey.slug
      )
    : null;

  const showComparison = modelA && modelB;
  const isInvalidSelection = Boolean((paramA || paramB) && !showComparison);

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Compare Models</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Compare specifications, pricing, and capabilities side-by-side.
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
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginRight: '6px',
                      backgroundColor:
                        modelA.status === 'ok'
                          ? '#22c55e'
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
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      marginRight: '6px',
                      backgroundColor:
                        modelB.status === 'ok'
                          ? '#22c55e'
                          : modelB.status === 'degraded'
                          ? '#f59e0b'
                          : '#9ca3af',
                    }}
                  />
                  {modelB.status}
                </td>
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
                <td style={{ padding: '0.75rem 1rem' }}>
                  {Array.isArray(modelA.modalityTags) && modelA.modalityTags.length > 0
                    ? modelA.modalityTags.join(', ')
                    : 'N/A'}
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  {Array.isArray(modelB.modalityTags) && modelB.modalityTags.length > 0
                    ? modelB.modalityTags.join(', ')
                    : 'N/A'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Last Snapshot Date</td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {modelA.lastSnapshotDate
                    ? new Date(modelA.lastSnapshotDate).toISOString().split('T')[0]
                    : new Date(modelA.updatedAt).toISOString().split('T')[0]}
                </td>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {modelB.lastSnapshotDate
                    ? new Date(modelB.lastSnapshotDate).toISOString().split('T')[0]
                    : new Date(modelB.updatedAt).toISOString().split('T')[0]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Select Models to Compare</h2>
          {isInvalidSelection ? (
            <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 500 }}>
              One or both selected models could not be found. Please choose two valid models from the options below.
            </p>
          ) : (
            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Please select two valid models from the available options below to view a side-by-side comparison.
            </p>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preset Comparisons</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              <li>
                <Link href="/compare?a=openai/gpt-4o&b=anthropic/claude-3-5-sonnet" style={{ color: '#0066cc' }}>
                  OpenAI GPT-4o vs Anthropic Claude 3.5 Sonnet
                </Link>
              </li>
              <li>
                <Link href="/compare?a=openai/gpt-4o-mini&b=anthropic/claude-3-5-haiku" style={{ color: '#0066cc' }}>
                  OpenAI GPT-4o mini vs Anthropic Claude 3.5 Haiku
                </Link>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Available Models</h3>
            {allModels.length === 0 ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>No models found in database.</p>
            ) : (
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                {allModels.map((model) => (
                  <li key={model.id}>
                    <Link
                      href={`/compare?a=${modelAKey ? `${modelAKey.provider}/${modelAKey.slug}` : `${model.providerSlug}/${model.slug}`}&b=${modelAKey ? `${model.providerSlug}/${model.slug}` : ''}`}
                      style={{ color: '#0066cc', textDecoration: 'none' }}
                    >
                      <strong>{model.name}</strong> ({model.providerName}/{model.slug})
                    </Link>
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
