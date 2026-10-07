import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, ne } from 'drizzle-orm';
import { TASK_RULES, TaskCategory, TaskPickModel } from '@/lib/picks';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    task: string;
  }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const taskKey = params.task as TaskCategory;
  const rule = TASK_RULES[taskKey];
  if (!rule) return { title: 'Task Not Found | Modelright' };
  return {
    title: `${rule.title} | Modelright`,
    description: rule.description,
  };
}

export default async function TaskPickPage(props: PageProps) {
  const params = await props.params;
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

    dbModels = results.map((r: any) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      providerName: r.providerName,
      providerSlug: r.providerSlug,
      contextWindow: r.contextWindow ?? 0,
      inputPricePerM: r.inputPricePerM ?? '0',
      outputPricePerM: r.outputPricePerM ?? '0',
      modalityTags: (r.modalityTags as string[]) ?? [],
      status: r.status ?? 'active',
    }));
  } catch (err) {
    console.error('Failed to fetch models for task picks:', err);
  }

  const pickedModels = rule.filterAndSort(dbModels);

  return (
    <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '0.75rem' }}>
          <Link href="/pick" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
            &larr; Back to Task Picks
          </Link>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>{rule.title}</h1>
        <p style={{ color: '#4b5563', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.5 }}>
          {rule.description}
        </p>
        <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.875rem 1rem', borderRadius: '0.5rem', fontSize: '0.9rem', color: '#166534' }}>
          <strong>Selection Rule:</strong> {rule.ruleText}
        </div>
      </header>

      {pickedModels.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', backgroundColor: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '1.05rem' }}>No models currently match this task criteria.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.925rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#374151', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                <th style={{ padding: '0.75rem 1rem', width: '60px' }}>Rank</th>
                <th style={{ padding: '0.75rem 1rem' }}>Model</th>
                <th style={{ padding: '0.75rem 1rem' }}>Provider</th>
                <th style={{ padding: '0.75rem 1rem' }}>Context Window</th>
                <th style={{ padding: '0.75rem 1rem' }}>Input / 1M</th>
                <th style={{ padding: '0.75rem 1rem' }}>Output / 1M</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pickedModels.map((model, idx) => {
                const isEven = idx % 2 === 0;
                const inPrice = parseFloat(model.inputPricePerM) || 0;
                const outPrice = parseFloat(model.outputPricePerM) || 0;

                return (
                  <tr
                    key={model.id}
                    style={{
                      backgroundColor: isEven ? '#ffffff' : '#f9fafb',
                      borderBottom: idx < pickedModels.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 700, color: '#6b7280' }}>
                      #{idx + 1}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                      <Link href={`/models/${model.providerSlug}/${model.slug}`} style={{ color: '#111827', textDecoration: 'none' }}>
                        {model.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>
                      {model.providerName}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>
                      {model.contextWindow.toLocaleString()} tokens
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>
                      ${inPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: '#4b5563' }}>
                      ${outPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <Link
                        href={`/models/${model.providerSlug}/${model.slug}`}
                        style={{
                          display: 'inline-block',
                          padding: '0.35rem 0.75rem',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          borderRadius: '0.375rem',
                          fontSize: '0.825rem',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        View Details
                      </Link>
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
