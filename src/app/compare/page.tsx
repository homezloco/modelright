import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { calculateCost } from '@/lib/calculator';

export const dynamic = 'force-dynamic';

export interface PageProps {
  searchParams: Promise<{
    a?: string;
    b?: string;
    m?: string;
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
  numericInputPrice: number;
  numericOutputPrice: number;
  modalityTags: string[];
  status: string;
  lastSeenAt: Date | null;
  updatedAt: Date;
  providerName: string;
  providerSlug: string;
  slug: string;
}

export function parseModelParam(param?: string) {
  if (!param) return null;
  const parts = param.split('/');
  if (parts.length !== 2) return null;
  const [provider, slug] = parts;
  if (!provider || !slug) return null;
  return { provider: provider.toLowerCase(), slug: slug.toLowerCase() };
}

export function processCompareParams(params: { a?: string; b?: string; m?: string }) {
  if (params.a || params.b) {
    const list = [params.a, params.b].filter(Boolean).join(',');
    return { redirectUrl: `/compare?m=${encodeURIComponent(list)}` };
  }
  const rawList = params.m ? params.m.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const exceedsLimit = rawList.length > 4;
  const modelKeys = rawList.slice(0, 4);
  return { redirectUrl: null, modelKeys, exceedsLimit };
}

export default async function ComparePage(props: PageProps) {
  const searchParams = await props.searchParams;

  const paramCheck = processCompareParams(searchParams);
  if (paramCheck.redirectUrl) {
    redirect(paramCheck.redirectUrl);
  }

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

    allModels = results.map((r: any) => ({
      ...r,
      numericInputPrice: Number(r.inputPricePerM) || 0,
      numericOutputPrice: Number(r.outputPricePerM) || 0,
      modalityTags: r.modalityTags || [],
    }));
  } catch (error) {
    console.error('Failed to load models for compare page:', error);
  }

  const selectedModels: ModelItem[] = [];
  for (const keyStr of paramCheck.modelKeys) {
    const parsed = parseModelParam(keyStr);
    if (parsed) {
      const match = allModels.find(
        (m) =>
          m.providerSlug.toLowerCase() === parsed.provider &&
          m.slug.toLowerCase() === parsed.slug
      );
      if (match) {
        selectedModels.push(match);
      }
    }
  }

  const inTokens = Math.max(0, Number(searchParams.in) || 1000);
  const outTokens = Math.max(0, Number(searchParams.out) || 500);
  const rpd = Math.max(0, Number(searchParams.rpd) || 1000);
  const callsPerMonth = rpd * 30;

  const showComparison = selectedModels.length >= 2;

  // Compute cheapest metrics across selected models
  const minInputPrice = showComparison ? Math.min(...selectedModels.map((m) => m.numericInputPrice)) : null;
  const minOutputPrice = showComparison ? Math.min(...selectedModels.map((m) => m.numericOutputPrice)) : null;

  const calcResults = selectedModels.map((m) =>
    calculateCost(inTokens, outTokens, callsPerMonth, m.numericInputPrice, m.numericOutputPrice)
  );

  const minCostPerCall = showComparison ? Math.min(...calcResults.map((c) => c.totalCostPerCall)) : null;
  const minCostPerDay = showComparison ? Math.min(...calcResults.map((c) => c.totalCostPerCall * rpd)) : null;
  const minCostPerMonth = showComparison ? Math.min(...calcResults.map((c) => c.totalCostPerMonth)) : null;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>Compare Models</h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
        Compare specifications, pricing, and estimated costs side-by-side for up to 4 models.
      </p>

      {paramCheck.exceedsLimit && (
        <div style={{ backgroundColor: '#7c2d12', color: '#ffedd5', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #9a3412' }}>
          <strong>Note:</strong> Maximum 4 models allowed. Showing the first 4 models — please pick up to 4 models to compare.
        </div>
      )}

      {showComparison ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/compare" style={{ color: '#38bdf8', textDecoration: 'none' }}>
              ← Reset comparison / Pick different models
            </Link>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1px solid #334155',
                textAlign: 'left',
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
                    <td key={m.id} style={{ padding: '0.75rem 1rem' }}>{m.contextWindow.toLocaleString()} tokens</td>
                  ))}
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Input Price / 1M</td>
                  {selectedModels.map((m) => {
                    const isCheapest = minInputPrice !== null && m.numericInputPrice === minInputPrice;
                    return (
                      <td
                        key={m.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: isCheapest ? '#064e3b' : 'transparent',
                          fontWeight: isCheapest ? 700 : 400,
                        }}
                      >
                        ${m.numericInputPrice.toFixed(2)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>(Cheapest)</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Output Price / 1M</td>
                  {selectedModels.map((m) => {
                    const isCheapest = minOutputPrice !== null && m.numericOutputPrice === minOutputPrice;
                    return (
                      <td
                        key={m.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: isCheapest ? '#064e3b' : 'transparent',
                          fontWeight: isCheapest ? 700 : 400,
                        }}
                      >
                        ${m.numericOutputPrice.toFixed(2)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>(Cheapest)</span>}
                      </td>
                    );
                  })}
                </tr>
                {/* Calculator Totals Section */}
                <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                  <td colSpan={selectedModels.length + 1} style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#38bdf8' }}>
                    Cost Calculator Totals ({inTokens} in / {outTokens} out tokens @ {rpd} req/day)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cost / Request</td>
                  {selectedModels.map((m, idx) => {
                    const cost = calcResults[idx].totalCostPerCall;
                    const isCheapest = minCostPerCall !== null && Math.abs(cost - minCostPerCall) < 1e-9;
                    return (
                      <td
                        key={m.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: isCheapest ? '#064e3b' : 'transparent',
                          fontWeight: isCheapest ? 700 : 400,
                        }}
                      >
                        ${cost.toFixed(4)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>(Cheapest)</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cost / Day</td>
                  {selectedModels.map((m, idx) => {
                    const cost = calcResults[idx].totalCostPerCall * rpd;
                    const isCheapest = minCostPerDay !== null && Math.abs(cost - minCostPerDay) < 1e-9;
                    return (
                      <td
                        key={m.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: isCheapest ? '#064e3b' : 'transparent',
                          fontWeight: isCheapest ? 700 : 400,
                        }}
                      >
                        ${cost.toFixed(2)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>(Cheapest)</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cost / Month (30d)</td>
                  {selectedModels.map((m, idx) => {
                    const cost = calcResults[idx].totalCostPerMonth;
                    const isCheapest = minCostPerMonth !== null && Math.abs(cost - minCostPerMonth) < 1e-9;
                    return (
                      <td
                        key={m.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: isCheapest ? '#064e3b' : 'transparent',
                          fontWeight: isCheapest ? 700 : 400,
                        }}
                      >
                        ${cost.toFixed(2)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399' }}>(Cheapest)</span>}
                      </td>
                    );
                  })}
                </tr>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Modalities</td>
                  {selectedModels.map((m) => (
                    <td key={m.id} style={{ padding: '0.75rem 1rem' }}>
                      {m.modalityTags.length > 0 ? m.modalityTags.join(', ') : 'text'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</td>
                  {selectedModels.map((m) => (
                    <td key={m.id} style={{ padding: '0.75rem 1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          marginRight: '0.5rem',
                          backgroundColor:
                            m.status === 'ok' ? '#10b981' : m.status === 'degraded' ? '#f59e0b' : '#9ca3af',
                        }}
                      />
                      {m.status}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Select Models to Compare</h2>
          {paramCheck.modelKeys.length > 0 && selectedModels.length < 2 && (
            <p style={{ color: '#f59e0b', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Please specify at least 2 valid models in the parameter (e.g., <code>?m=provider/slug,provider/slug</code>).
            </p>
          )}

          {allModels.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preset Comparisons</h3>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.8' }}>
                {allModels.length >= 2 && (
                  <li>
                    <Link
                      href={`/compare?m=${allModels[0].providerSlug}/${allModels[0].slug},${allModels[1].providerSlug}/${allModels[1].slug}`}
                      style={{ color: '#38bdf8' }}
                    >
                      {allModels[0].providerName} {allModels[0].name} vs {allModels[1].providerName} {allModels[1].name}
                    </Link>
                  </li>
                )}
                {allModels.length >= 3 && (
                  <li>
                    <Link
                      href={`/compare?m=${allModels[0].providerSlug}/${allModels[0].slug},${allModels[1].providerSlug}/${allModels[1].slug},${allModels[2].providerSlug}/${allModels[2].slug}`}
                      style={{ color: '#38bdf8' }}
                    >
                      3-Model Compare: {allModels[0].name}, {allModels[1].name}, {allModels[2].name}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Available Models</h3>
            {allModels.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No models available in the database.</p>
            ) : (
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                {allModels.map((model) => (
                  <li key={model.id}>
                    <strong>{model.name}</strong> ({model.providerSlug}/{model.slug})
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
