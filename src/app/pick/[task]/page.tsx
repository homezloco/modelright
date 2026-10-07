import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, ne } from 'drizzle-orm';
import { TASK_RULES, TaskCategory, TaskPickModel } from '@/lib/picks';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    task: string;
  };
}

export async function generateMetadata({ params }: PageProps) {
  const taskKey = params.task as TaskCategory;
  const rule = TASK_RULES[taskKey];
  if (!rule) return { title: 'Task Not Found | Modelright' };
  return {
    title: `${rule.title} | Modelright`,
    description: rule.description,
  };
}

export default async function TaskPickPage({ params }: PageProps) {
  const taskKey = params.task as TaskCategory;
  const rule = TASK_RULES[taskKey];

  if (!rule) {
    notFound();
  }

  let dbModels: TaskPickModel[] = [];
  try {
    const results = await db
      .select({
        id: models.id,
        name: models.name,
        slug: models.slug,
        providerName: providers.name,
        providerSlug: providers.slug,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        modalityTags: models.modalityTags,
        status: models.status,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(ne(models.status, 'removed'));

    dbModels = results.map((r) => ({
      ...r,
      modalityTags: r.modalityTags || [],
    }));
  } catch (error) {
    console.error(`Failed to load models for task pick ${taskKey}:`, error);
  }

  const top10 = rule.filterAndSort(dbModels);

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/pick" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem' }}>
          &larr; Back to Task Picks
        </Link>
      </div>

      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{rule.title}</h1>
        <p style={{ color: '#4b5563', fontSize: '1.05rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          {rule.description}
        </p>

        <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.5rem', padding: '1rem', color: '#1e40af' }}>
          <strong>Explicit Ranking Rule:</strong> {rule.ruleText}
        </div>
      </header>

      {top10.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', border: '1px dashed #d1d5db', borderRadius: '0.5rem', color: '#6b7280' }}>
          No models currently match this task criteria.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '0.75rem', width: '50px' }}>#</th>
                <th style={{ padding: '0.75rem' }}>Model</th>
                <th style={{ padding: '0.75rem' }}>Provider</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Context Window</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Input / 1M</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>Output / 1M</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {top10.map((model, idx) => {
                const modelKey = `${model.providerSlug}/${model.slug}`;
                return (
                  <tr key={model.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 700, color: '#6b7280' }}>{idx + 1}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      <Link href={`/models/${model.providerSlug}/${model.slug}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {model.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#4b5563' }}>{model.providerName}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      {model.contextWindow.toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      ${parseFloat(model.inputPricePerM).toFixed(4)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontFamily: 'monospace' }}>
                      ${parseFloat(model.outputPricePerM).toFixed(4)}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link
                          href={`/models/${model.providerSlug}/${model.slug}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#f3f4f6',
                            color: '#1f2937',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                          }}
                        >
                          Detail
                        </Link>
                        <Link
                          href={`/compare?m=${encodeURIComponent(modelKey)}`}
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            borderRadius: '0.25rem',
                            textDecoration: 'none',
                          }}
                        >
                          Compare
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
