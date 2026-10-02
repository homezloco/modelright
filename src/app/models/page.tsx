import { eq, asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';

export interface ModelRow {
  id: string;
  name: string;
  slug: string;
  providerName: string;
  providerSlug: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  updatedAt: Date;
}

export async function getModels(): Promise<ModelRow[]> {
  try {
    const rows = await db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        providerName: providers.name,
        providerSlug: providers.slug,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        updatedAt: models.updatedAt,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .orderBy(asc(providers.name), asc(models.name));

    return rows;
  } catch (err) {
    // If DB is not connected or query fails, return empty list gracefully
    console.error('Failed to fetch models from database:', err);
    return [];
  }
}

function formatPrice(priceStr: string): string {
  const num = parseFloat(priceStr);
  if (isNaN(num)) return `$${priceStr}`;
  return `$${num.toFixed(2)}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function ModelsPage() {
  const modelList = await getModels();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>AI Models Directory</h1>
        <p style={{ color: '#666' }}>
          Compare pricing, context windows, and specifications across LLM providers.
        </p>
      </header>

      {modelList.length === 0 ? (
        <div
          style={{
            padding: '3rem 1.5rem',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#4b5563',
          }}
        >
          <p style={{ fontSize: '1.125rem', fontWeight: 500, marginBottom: '0.5rem' }}>No models found</p>
          <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            There are currently no AI models ingested or available in the system. Check back later after ingestion runs.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Provider</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Window</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Input ($/1M)</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Output ($/1M)</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {modelList.map((model) => (
                <tr key={model.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{model.name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#4b5563' }}>{model.providerName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{model.contextWindow.toLocaleString()} tokens</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{formatPrice(model.inputPricePerM)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{formatPrice(model.outputPricePerM)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    {formatDate(model.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
