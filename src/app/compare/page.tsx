import Link from 'next/link';
import { redirect } from 'next/navigation';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { calculateCost } from '@/lib/calculator';

export const dynamic = 'force-dynamic';

export interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export function processCompareParams(params: Record<string, string | string[] | undefined>) {
  const a = Array.isArray(params.a) ? params.a[0] : params.a;
  const b = Array.isArray(params.b) ? params.b[0] : params.b;
  const m = Array.isArray(params.m) ? params.m[0] : params.m;

  if (a || b) {
    const list = [a, b].filter(Boolean).join(',');
    return { redirectUrl: `/compare?m=${encodeURIComponent(list)}` };
  }
  const rawList = m ? m.split(',').map((s) => s.trim()).filter(Boolean) : [];
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
  const rawModelKeys = paramCheck.modelKeys;
  for (const keyStr of rawModelKeys) {
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

  const getParam = (val?: string | string[]) => (Array.isArray(val) ? val[0] : val);
  const inTokens = Math.max(0, Number(getParam(searchParams.in)) || 1000);
  const outTokens = Math.max(0, Number(getParam(searchParams.out)) || 500);
  const rpd = Math.max(0, Number(getParam(searchParams.rpd)) || 1000);
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
                <tr style={{ backgroundColor: '#1e293b', borderBottom: '2px solid #334155' }}>
                  <th style={{ padding: '0.75rem', borderRight: '1px solid #334155', width: '200px' }}>Attribute</th>
                  {selectedModels.map((model) => (
                    <th key={model.id} style={{ padding: '0.75rem', borderRight: '1px solid #334155' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{model.name}</div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {model.providerName} ({model.providerSlug}/{model.slug})
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Context Window
                  </td>
                  {selectedModels.map((model) => (
                    <td key={model.id} style={{ padding: '0.75rem', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                      {model.contextWindow ? model.contextWindow.toLocaleString() : 'N/A'} tokens
                    </td>
                  ))}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Input Price / 1M
                  </td>
                  {selectedModels.map((model) => {
                    const isCheapest = minInputPrice !== null && model.numericInputPrice === minInputPrice;
                    return (
                      <td
                        key={model.id}
                        style={{
                          padding: '0.75rem',
                          borderRight: '1px solid #334155',
                          borderBottom: '1px solid #334155',
                          backgroundColor: isCheapest ? '#064e3b' : undefined,
                        }}
                      >
                        ${model.numericInputPrice.toFixed(4)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>Cheapest</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Output Price / 1M
                  </td>
                  {selectedModels.map((model) => {
                    const isCheapest = minOutputPrice !== null && model.numericOutputPrice === minOutputPrice;
                    return (
                      <td
                        key={model.id}
                        style={{
                          padding: '0.75rem',
                          borderRight: '1px solid #334155',
                          borderBottom: '1px solid #334155',
                          backgroundColor: isCheapest ? '#064e3b' : undefined,
                        }}
                      >
                        ${model.numericOutputPrice.toFixed(4)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>Cheapest</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Modalities
                  </td>
                  {selectedModels.map((model) => (
                    <td key={model.id} style={{ padding: '0.75rem', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                      {model.modalityTags.length > 0 ? model.modalityTags.join(', ') : 'Text'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Status
                  </td>
                  {selectedModels.map((model) => (
                    <td key={model.id} style={{ padding: '0.75rem', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: model.status === 'ok' ? '#22c55e' : model.status === 'degraded' ? '#f59e0b' : '#64748b',
                          marginRight: '0.5rem',
                        }}
                      />
                      {model.status || 'unknown'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Last Seen
                  </td>
                  {selectedModels.map((model) => (
                    <td key={model.id} style={{ padding: '0.75rem', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                      {model.lastSeenAt ? new Date(model.lastSeenAt).toLocaleDateString() : 'N/A'}
                    </td>
                  ))}
                </tr>

                {/* Calculator Rows */}
                <tr style={{ backgroundColor: '#1e293b' }}>
                  <td
                    colSpan={selectedModels.length + 1}
                    style={{ padding: '0.75rem', fontWeight: 'bold', borderBottom: '1px solid #334155', fontSize: '1.05rem' }}
                  >
                    Estimated Usage Costs ({inTokens.toLocaleString()} in / {outTokens.toLocaleString()} out / {rpd.toLocaleString()} req/day)
                  </td>
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Cost / Request
                  </td>
                  {calcResults.map((calc, idx) => {
                    const isCheapest = minCostPerCall !== null && calc.totalCostPerCall === minCostPerCall;
                    return (
                      <td
                        key={selectedModels[idx].id}
                        style={{
                          padding: '0.75rem',
                          borderRight: '1px solid #334155',
                          borderBottom: '1px solid #334155',
                          backgroundColor: isCheapest ? '#064e3b' : undefined,
                        }}
                      >
                        ${calc.totalCostPerCall.toFixed(6)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>Cheapest</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Cost / Day
                  </td>
                  {calcResults.map((calc, idx) => {
                    const costPerDay = calc.totalCostPerCall * rpd;
                    const isCheapest = minCostPerDay !== null && costPerDay === minCostPerDay;
                    return (
                      <td
                        key={selectedModels[idx].id}
                        style={{
                          padding: '0.75rem',
                          borderRight: '1px solid #334155',
                          borderBottom: '1px solid #334155',
                          backgroundColor: isCheapest ? '#064e3b' : undefined,
                        }}
                      >
                        ${costPerDay.toFixed(4)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>Cheapest</span>}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td style={{ padding: '0.75rem', fontWeight: '600', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                    Cost / Month (30d)
                  </td>
                  {calcResults.map((calc, idx) => {
                    const isCheapest = minCostPerMonth !== null && calc.totalCostPerMonth === minCostPerMonth;
                    return (
                      <td
                        key={selectedModels[idx].id}
                        style={{
                          padding: '0.75rem',
                          borderRight: '1px solid #334155',
                          borderBottom: '1px solid #334155',
                          backgroundColor: isCheapest ? '#064e3b' : undefined,
                        }}
                      >
                        ${calc.totalCostPerMonth.toFixed(2)}
                        {isCheapest && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#34d399', fontWeight: 'bold' }}>Cheapest</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginTop: 0, marginBottom: '0.75rem' }}>Select Models to Compare</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1rem' }}>
              Specify 2 to 4 model keys in the URL parameter <code>?m=provider/slug,provider/slug</code> or pick from available models below.
            </p>

            {selectedModels.length === 1 && (
              <p style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                Only 1 valid model selected ({selectedModels[0].name}). Please add at least 1 more model to compare.
              </p>
            )}
          </div>

          {allModels.length >= 2 && (
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preset Comparisons</h3>
              <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
                <li>
                  <Link
                    href={`/compare?m=${allModels[0].providerSlug}/${allModels[0].slug},${allModels[1].providerSlug}/${allModels[1].slug}`}
                    style={{ color: '#38bdf8' }}
                  >
                    {allModels[0].name} vs {allModels[1].name}
                  </Link>
                </li>
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
