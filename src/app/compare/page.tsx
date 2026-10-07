import { redirect } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { calculateCost } from '@/lib/calculator';

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

export interface ModelItem {
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

export function parseModelKeys(mParam?: string): string[] {
  if (!mParam) return [];
  return mParam
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function getCheapestIndices(values: (number | null)[]): number[] {
  const validValues = values.filter((v): v is number => v !== null && !isNaN(v));
  if (validValues.length === 0) return [];
  const minVal = Math.min(...validValues);
  const cheapest: number[] = [];
  values.forEach((v, idx) => {
    if (v !== null && Math.abs(v - minVal) < 1e-9) {
      cheapest.push(idx);
    }
  });
  return cheapest;
}

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
  const callsPerMonth = rpd * 30;

  const inputPrices = selectedModels.map((m) => parseFloat(m.inputPricePerM) || 0);
  const outputPrices = selectedModels.map((m) => parseFloat(m.outputPricePerM) || 0);
  const contextWindows = selectedModels.map((m) => m.contextWindow || 0);

  const cheapestInputIndices = getCheapestIndices(inputPrices);
  const cheapestOutputIndices = getCheapestIndices(outputPrices);

  const calculatedCosts = selectedModels.map((m) => {
    const inP = parseFloat(m.inputPricePerM) || 0;
    const outP = parseFloat(m.outputPricePerM) || 0;
    return calculateCost(inputTokens, outputTokens, callsPerMonth, inP, outP);
  });

  const monthCosts = calculatedCosts.map((c) => c.totalCostPerMonth);
  const cheapestMonthIndices = getCheapestIndices(monthCosts);

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

      {selectedModels.length > 0 ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/compare" style={{ color: '#38bdf8', textDecoration: 'none' }}>
              ← Reset comparison / Pick different models
            </Link>
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #334155',
              textAlign: 'left',
              marginBottom: '2rem',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#1e293b', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '0.75rem 1rem', width: '25%' }}>Spec / Metric</th>
                {selectedModels.map((m) => (
                  <th key={m.id} style={{ padding: '0.75rem 1rem' }}>
                    <Link href={`/models/${m.providerSlug}/${m.slug}`} style={{ color: '#38bdf8', textDecoration: 'none' }}>
                      {m.name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>{m.providerName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Provider</td>
                {selectedModels.map((m) => (
                  <td key={m.id} style={{ padding: '0.75rem 1rem' }}>{m.providerName}</td>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Window</td>
                {selectedModels.map((m) => (
                  <td key={m.id} style={{ padding: '0.75rem 1rem' }}>
                    {m.contextWindow ? m.contextWindow.toLocaleString() : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Input Price / 1M</td>
                {selectedModels.map((m, idx) => {
                  const isCheapest = cheapestInputIndices.includes(idx);
                  return (
                    <td
                      key={m.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: isCheapest ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        fontWeight: isCheapest ? 700 : 400,
                        color: isCheapest ? '#4ade80' : 'inherit',
                      }}
                    >
                      ${m.inputPricePerM} {isCheapest && '★'}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Output Price / 1M</td>
                {selectedModels.map((m, idx) => {
                  const isCheapest = cheapestOutputIndices.includes(idx);
                  return (
                    <td
                      key={m.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: isCheapest ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        fontWeight: isCheapest ? 700 : 400,
                        color: isCheapest ? '#4ade80' : 'inherit',
                      }}
                    >
                      ${m.outputPricePerM} {isCheapest && '★'}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Est. Cost / Month ({rpd} rpd)</td>
                {selectedModels.map((m, idx) => {
                  const isCheapest = cheapestMonthIndices.includes(idx);
                  const cost = calculatedCosts[idx];
                  return (
                    <td
                      key={m.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: isCheapest ? 'rgba(34, 197, 94, 0.15)' : 'transparent',
                        fontWeight: isCheapest ? 700 : 400,
                        color: isCheapest ? '#4ade80' : 'inherit',
                      }}
                    >
                      ${cost.totalCostPerMonth.toFixed(2)} {isCheapest && '★'}
                    </td>
                  );
                })}
              </tr>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Modalities</td>
                {selectedModels.map((m) => (
                  <td key={m.id} style={{ padding: '0.75rem 1rem' }}>
                    {m.modalityTags && m.modalityTags.length > 0 ? m.modalityTags.join(', ') : 'text'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: '#1e293b', border: '1px solid #334155', padding: '2rem', borderRadius: '8px' }}>
          <h2>Select Models to Compare</h2>
          <p style={{ color: '#94a3b8' }}>
            Choose up to 4 models to see a side-by-side comparison of pricing, context window, and estimated usage cost.
          </p>
          {allModels.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {allModels.slice(0, 10).map((m) => (
                <Link
                  key={m.id}
                  href={`/compare?m=${m.providerSlug}/${m.slug}`}
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
                  + {m.name} ({m.providerName})
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
