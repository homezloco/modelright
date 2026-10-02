import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ModelsPage() {
  let modelRows: Array<{
    id: string;
    name: string;
    contextWindow: number;
    inputPricePerM: string;
    outputPricePerM: string;
    updatedAt: Date;
    providerName: string;
    providerSlug: string;
  }> = [];

  try {
    const results = await db
      .select({
        id: models.id,
        name: models.name,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        updatedAt: models.updatedAt,
        providerName: providers.name,
        providerSlug: providers.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .orderBy(asc(providers.name), asc(models.name));

    modelRows = results;
  } catch (error) {
    // In environments where DB is unavailable at build/runtime or no connection string
    console.error('Failed to load models:', error);
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.875rem', fontWeight: 'bold' }}>Models</h1>

      {modelRows.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic', padding: '2rem 0' }}>
          No models available.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Provider</th>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Context Window</th>
                <th style={{ padding: '0.75rem 1rem' }}>$/1M Input</th>
                <th style={{ padding: '0.75rem 1rem' }}>$/1M Output</th>
                <th style={{ padding: '0.75rem 1rem' }}>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {modelRows.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{m.providerName}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{m.name}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{m.contextWindow.toLocaleString()} tokens</td>
                  <td style={{ padding: '0.75rem 1rem' }}>${Number(m.inputPricePerM).toFixed(4)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>${Number(m.outputPricePerM).toFixed(4)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                    {new Date(m.updatedAt).toISOString().split('T')[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
