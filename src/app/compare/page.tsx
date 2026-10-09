import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import CompareTable from '@/components/CompareTable';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    m?: string;
    a?: string;
    b?: string;
    in?: string;
    out?: string;
    rpd?: string;
  }>;
}

import { ModelItem, parseModelKeys, CURATED_PRESETS, resolvePresetKeys, modelKey } from '@/lib/compare';
import ComparePicker from '@/components/ComparePicker';
import CardStack from '@/components/CardStack';
import '@/styles/responsive.css';

export default async function ComparePage(props: PageProps) {
  const searchParams = await props.searchParams;

  // Handle old ?a=&b= params redirect to ?m=
  if (searchParams.a || searchParams.b) {
    const legacyKeys = [searchParams.a, searchParams.b].filter(Boolean);
    const mQuery = legacyKeys.join(',');
    redirect(`/compare?m=${encodeURIComponent(mQuery)}`);
  }

  const rawKeys = parseModelKeys(searchParams.m);
  const overCap = rawKeys.length > 4;
  const targetKeys = rawKeys.slice(0, 4);

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

  const selectedModels: ModelItem[] = [];
  for (const key of targetKeys) {
    const parts = key.split('/');
    if (parts.length === 2) {
      const [pSlug, mSlug] = parts;
      const found = allModels.find(
        (m) =>
          m.providerSlug.toLowerCase() === pSlug &&
          m.slug.toLowerCase() === mSlug
      );
      if (found) {
        selectedModels.push(found);
      }
    }
  }

  // Calculator params defaults (1000 input, 500 output, 1000 requests/day = ~30000 requests/month)
  const inputTokens = Math.max(0, parseInt(searchParams.in || '1000', 10) || 1000);
  const outputTokens = Math.max(0, parseInt(searchParams.out || '500', 10) || 500);
  const rpd = Math.max(0, parseInt(searchParams.rpd || '1000', 10) || 1000);

  const pickerModels = allModels.map((m) => ({
    key: modelKey(m),
    name: m.name,
    providerName: m.providerName,
    status: m.status,
  }));
  const presets = CURATED_PRESETS.map((p) => ({ preset: p, keys: resolvePresetKeys(p, allModels) })).filter(
    (p): p is { preset: (typeof CURATED_PRESETS)[number]; keys: string[] } => p.keys !== null
  );

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>Compare Models</h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
        Compare specifications, pricing, and capabilities side-by-side across AI model providers.
      </p>

      {overCap && (
        <div
          style={{
            background: '#451a03',
            border: '1px solid #b45309',
            color: '#fde68a',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Note:</strong> You requested more than 4 models. Displaying the first 4 selected models (pick up to 4 models max).
        </div>
      )}

      {selectedModels.length > 0 && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/compare" style={{ color: '#38bdf8', textDecoration: 'none' }}>
              ← Reset comparison / Pick different models
            </Link>
          </div>

          <CompareTable
            selectedModels={selectedModels}
            inputTokens={inputTokens}
            outputTokens={outputTokens}
            rpd={rpd}
          />

          {/* Mobile card stack view */}
          <div className="responsive-card-stack">
            <CardStack 
              data={selectedModels.map(model => ({
                name: model.name,
                provider: model.providerName,
                contextWindow: model.contextWindow?.toLocaleString() || 'N/A',
                inputPrice: model.inputPricePerM ? `${model.inputPricePerM}` : 'N/A',
                outputPrice: model.outputPricePerM ? `${model.outputPricePerM}` : 'N/A',
                modalities: model.modalityTags?.join(', ') || 'text'
              }))}
              labels={{
                name: 'Model',
                provider: 'Provider',
                contextWindow: 'Context Window',
                inputPrice: 'Input Price (/1M)',
                outputPrice: 'Output Price (/1M)',
                modalities: 'Modalities'
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          padding: '2rem',
          borderRadius: '8px',
          marginTop: selectedModels.length > 0 ? '2rem' : 0,
        }}
      >
        <h2>{selectedModels.length > 0 ? 'Change Selection' : 'Select Models to Compare'}</h2>
        <p style={{ color: '#94a3b8' }}>
          Choose up to 4 models to see a side-by-side comparison of pricing, context window, and estimated usage cost.
        </p>

        {presets.length > 0 && (
          <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Curated comparisons</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {presets.map(({ preset, keys }) => (
                <Link
                  key={preset.name}
                  href={`/compare?m=${encodeURIComponent(keys.join(','))}`}
                  title={preset.blurb}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#0f172a',
                    border: '1px solid #475569',
                    borderRadius: '4px',
                    color: '#38bdf8',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                  }}
                >
                  {preset.name}: {preset.blurb}
                </Link>
              ))}
            </div>
          </div>
        )}

        {pickerModels.length > 0 ? (
          <ComparePicker models={pickerModels} initialSelected={selectedModels.map(modelKey)} />
        ) : (
          <p style={{ color: '#94a3b8' }}>No models in the registry yet — check back after the next sync.</p>
        )}
      </div>
    </main>
  );
}
