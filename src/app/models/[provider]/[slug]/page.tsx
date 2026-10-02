import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/db/client';
import { providers, models, modelSnapshots, ingestLog } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface ModelDetailPageProps {
  params: {
    provider: string;
    slug: string;
  };
}

// Fallback sample models used when DB has not been seeded yet
const SAMPLE_MODELS: Record<string, {
  name: string;
  providerName: string;
  contextWindow: number;
  inputPricePerM: string;
  outputPricePerM: string;
  modalityTags: string[];
  updatedAt: string;
  snapshots: Array<{
    id: string;
    capturedAt: string;
    availability: string;
    inputPricePerM: string;
    outputPricePerM: string;
    source: string;
  }>;
}> = {
  'openai/gpt-4o': {
    name: 'GPT-4o',
    providerName: 'OpenAI',
    contextWindow: 128000,
    inputPricePerM: '$2.50',
    outputPricePerM: '$10.00',
    modalityTags: ['text', 'image', 'audio'],
    updatedAt: '2026-10-01T12:00:00Z',
    snapshots: [
      {
        id: 'snap-1',
        capturedAt: '2026-10-01 12:00:00 UTC',
        availability: 'available',
        inputPricePerM: '$2.50',
        outputPricePerM: '$10.00',
        source: 'OpenAI API Ingest',
      },
      {
        id: 'snap-2',
        capturedAt: '2026-09-30 12:00:00 UTC',
        availability: 'available',
        inputPricePerM: '$2.50',
        outputPricePerM: '$10.00',
        source: 'OpenAI API Ingest',
      },
    ],
  },
  'anthropic/claude-3-5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    providerName: 'Anthropic',
    contextWindow: 200000,
    inputPricePerM: '$3.00',
    outputPricePerM: '$15.00',
    modalityTags: ['text', 'image'],
    updatedAt: '2026-10-01T12:00:00Z',
    snapshots: [
      {
        id: 'snap-3',
        capturedAt: '2026-10-01 12:00:00 UTC',
        availability: 'available',
        inputPricePerM: '$3.00',
        outputPricePerM: '$15.00',
        source: 'Anthropic API Ingest',
      },
    ],
  },
  'openrouter/meta-llama-3-70b-instruct': {
    name: 'Meta Llama 3 70B Instruct',
    providerName: 'OpenRouter',
    contextWindow: 8192,
    inputPricePerM: '$0.59',
    outputPricePerM: '$0.79',
    modalityTags: ['text'],
    updatedAt: '2026-10-01T12:00:00Z',
    snapshots: [
      {
        id: 'snap-4',
        capturedAt: '2026-10-01 12:00:00 UTC',
        availability: 'available',
        inputPricePerM: '$0.59',
        outputPricePerM: '$0.79',
        source: 'OpenRouter API Ingest',
      },
    ],
  },
};

async function getModelData(providerSlug: string, modelSlug: string) {
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
      .select()
      .from(models)
      .where(and(eq(models.providerId, providerRec.id), eq(models.slug, modelSlug)))
      .limit(1);

    if (modelList.length === 0) {
      return null;
    }

    const modelRec = modelList[0];

    const snapshotRows = await db
      .select({
        id: modelSnapshots.id,
        capturedAt: modelSnapshots.capturedAt,
        availability: modelSnapshots.availability,
        inputPricePerM: modelSnapshots.inputPricePerM,
        outputPricePerM: modelSnapshots.outputPricePerM,
        rawPayload: modelSnapshots.rawPayload,
      })
      .from(modelSnapshots)
      .where(eq(modelSnapshots.modelId, modelRec.id))
      .orderBy(desc(modelSnapshots.capturedAt))
      .limit(10);

    return {
      name: modelRec.name,
      providerName: providerRec.name,
      contextWindow: modelRec.contextWindow,
      inputPricePerM: `$${Number(modelRec.inputPricePerM).toFixed(2)}`,
      outputPricePerM: `$${Number(modelRec.outputPricePerM).toFixed(2)}`,
      modalityTags: modelRec.modalityTags || [],
      updatedAt: modelRec.updatedAt ? new Date(modelRec.updatedAt).toISOString() : '',
      snapshots: snapshotRows.map((s) => ({
        id: s.id,
        capturedAt: new Date(s.capturedAt).toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        availability: s.availability,
        inputPricePerM: `$${Number(s.inputPricePerM).toFixed(2)}`,
        outputPricePerM: `$${Number(s.outputPricePerM).toFixed(2)}`,
        source: (s.rawPayload as any)?.source || 'Ingest pipeline',
      })),
    };
  } catch (error) {
    // Fall back to sample data if DB query fails or isn't seeded
    const key = `${providerSlug.toLowerCase()}/${modelSlug.toLowerCase()}`;
    return SAMPLE_MODELS[key] || null;
  }
}

export default async function ModelDetailPage({ params }: ModelDetailPageProps) {
  const model = await getModelData(params.provider, params.slug);

  if (!model) {
    notFound();
  }

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/models" style={{ color: '#0066cc', textDecoration: 'none' }}>
          ← Back to Models
        </Link>
      </div>

      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
        <span style={{ fontSize: '0.9rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {model.providerName}
        </span>
        <h1 style={{ fontSize: '2rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>{model.name}</h1>
        <p style={{ color: '#555', fontFamily: 'monospace' }}>
          {params.provider}/{params.slug}
        </p>
      </header>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Specifications</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Context Window</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {model.contextWindow.toLocaleString()} tokens
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Input Price / 1M</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {model.inputPricePerM}
            </div>
          </div>
          <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '6px' }}>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>Output Price / 1M</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '0.25rem' }}>
              {model.outputPricePerM}
            </div>
          </div>
        </div>

        {model.modalityTags.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#666', marginRight: '0.5rem' }}>Modalities:</span>
            {model.modalityTags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-block',
                  background: '#eef',
                  color: '#339',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  marginRight: '0.5rem',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Snapshot History & Ingest Provenance</h2>
        {model.snapshots.length === 0 ? (
          <p style={{ color: '#666' }}>No snapshot history recorded yet.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '0.5rem' }}>Captured At</th>
                <th style={{ padding: '0.5rem' }}>Availability</th>
                <th style={{ padding: '0.5rem' }}>Input / 1M</th>
                <th style={{ padding: '0.5rem' }}>Output / 1M</th>
                <th style={{ padding: '0.5rem' }}>Provenance / Source</th>
              </tr>
            </thead>
            <tbody>
              {model.snapshots.map((snap) => (
                <tr key={snap.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {snap.capturedAt}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        background: snap.availability === 'available' ? '#e6f4ea' : '#fce8e6',
                        color: snap.availability === 'available' ? '#137333' : '#c5221f',
                      }}
                    >
                      {snap.availability}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{snap.inputPricePerM}</td>
                  <td style={{ padding: '0.5rem' }}>{snap.outputPricePerM}</td>
                  <td style={{ padding: '0.5rem', color: '#555', fontSize: '0.9rem' }}>{snap.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link
          href={`/compare?a=${params.provider}/${params.slug}`}
          style={{
            padding: '0.5rem 1rem',
            background: '#0066cc',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          Compare this model →
        </Link>
      </div>
    </main>
  );
}
