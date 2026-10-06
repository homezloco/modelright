import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, asc, desc, sql, SQL, count } from 'drizzle-orm';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 5;

interface SearchParams {
  provider?: string;
  sort?: string;
  page?: string;
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const providerFilter = searchParams?.provider?.trim().toLowerCase() || '';
  const sortParam = searchParams?.sort || '';
  const rawPage = parseInt(searchParams?.page || '1', 10);
  const currentPage = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;

  let modelRows: Array<{
    id: string;
    name: string;
    contextWindow: number;
    inputPricePerM: string;
    outputPricePerM: string;
    status: string;
    updatedAt: Date;
    providerName: string;
    providerSlug: string;
  }> = [];

  let providerList: Array<{ name: string; slug: string }> = [];
  let totalCount = 0;

  try {
    // Fetch distinct providers for the filter dropdown
    providerList = await db
      .select({
        name: providers.name,
        slug: providers.slug,
      })
      .from(providers)
      .orderBy(asc(providers.name));

    // Build WHERE clause
    const whereConditions: SQL[] = [];
    if (providerFilter) {
      whereConditions.push(eq(sql`LOWER(${providers.slug})`, providerFilter));
    }
    const whereClause =
      whereConditions.length > 0 ? whereConditions[0] : undefined;

    // Count total matching rows
    const countResult = await db
      .select({ value: count() })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(whereClause);

    totalCount = Number(countResult[0]?.value || 0);

    // Determine ORDER BY
    let orderByClause;
    if (sortParam === 'price_in') {
      orderByClause = [asc(models.inputPricePerM), asc(models.name)];
    } else if (sortParam === 'price_in_desc') {
      orderByClause = [desc(models.inputPricePerM), asc(models.name)];
    } else if (sortParam === 'price_out') {
      orderByClause = [asc(models.outputPricePerM), asc(models.name)];
    } else if (sortParam === 'price_out_desc') {
      orderByClause = [desc(models.outputPricePerM), asc(models.name)];
    } else if (sortParam === 'name') {
      orderByClause = [asc(models.name)];
    } else {
      // default sort by provider then name
      orderByClause = [asc(providers.name), asc(models.name)];
    }

    const offset = (currentPage - 1) * PAGE_SIZE;

    const results = await db
      .select({
        id: models.id,
        name: models.name,
        contextWindow: models.contextWindow,
        inputPricePerM: models.inputPricePerM,
        outputPricePerM: models.outputPricePerM,
        status: models.status,
        updatedAt: models.updatedAt,
        providerName: providers.name,
        providerSlug: providers.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id))
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(PAGE_SIZE)
      .offset(offset);

    modelRows = results;
  } catch (error) {
    console.error('Failed to load models:', error);
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const createQueryString = (params: {
    provider?: string;
    sort?: string;
    page?: number;
  }) => {
    const newParams = new URLSearchParams();

    const newProvider =
      params.provider !== undefined ? params.provider : providerFilter;
    const newSort = params.sort !== undefined ? params.sort : sortParam;
    const newPage = params.page !== undefined ? params.page : currentPage;

    if (newProvider) newParams.set('provider', newProvider);
    if (newSort) newParams.set('sort', newSort);
    if (newPage > 1) newParams.set('page', newPage.toString());

    const qs = newParams.toString();
    return qs ? `/models?${qs}` : '/models';
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', margin: 0 }}>Models</h1>

        {/* Filters and Controls */}
        <form method="GET" action="/models" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label htmlFor="provider-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Provider:
            </label>
            <select
              id="provider-select"
              name="provider"
              defaultValue={providerFilter}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '0.875rem' }}
            >
              <option value="">All Providers</option>
              {providerList.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort-select" style={{ marginRight: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Sort by:
            </label>
            <select
              id="sort-select"
              name="sort"
              defaultValue={sortParam}
              style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', backgroundColor: '#fff', fontSize: '0.875rem' }}
            >
              <option value="">Default (Provider)</option>
              <option value="price_in">Price $/1M Input (Low to High)</option>
              <option value="price_in_desc">Price $/1M Input (High to Low)</option>
              <option value="price_out">Price $/1M Output (Low to High)</option>
              <option value="price_out_desc">Price $/1M Output (High to Low)</option>
              <option value="name">Name</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '0.375rem 0.875rem',
              borderRadius: '0.375rem',
              border: '1px solid #3b82f6',
              backgroundColor: '#3b82f6',
              color: '#fff',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Apply
          </button>

          {(providerFilter || sortParam) && (
            <Link
              href="/models"
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                textDecoration: 'underline',
              }}
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {modelRows.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic', padding: '2rem 0' }}>
          No models available.
        </p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb', color: '#374151' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Provider</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Context Window</th>
                  <th style={{ padding: '0.75rem 1rem' }}>$/1M Input</th>
                  <th style={{ padding: '0.75rem 1rem' }}>$/1M Output</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Updated At</th>
                </tr>
              </thead>
              <tbody>
                {modelRows.map((m) => {
                  const statusColor =
                    m.status === 'ok'
                      ? '#10b981'
                      : m.status === 'degraded'
                      ? '#f59e0b'
                      : '#9ca3af';

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span
                          title={m.status}
                          style={{
                            display: 'inline-block',
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: statusColor,
                          }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{m.providerName}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{m.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{m.contextWindow.toLocaleString()} tokens</td>
                      <td style={{ padding: '0.75rem 1rem' }}>${Number(m.inputPricePerM).toFixed(4)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>${Number(m.outputPricePerM).toFixed(4)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        {new Date(m.updatedAt).toISOString().split('T')[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(currentPage * PAGE_SIZE, totalCount)} of {totalCount} models
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {currentPage > 1 ? (
                <Link
                  href={createQueryString({ page: currentPage - 1 })}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  Previous
                </Link>
              ) : (
                <span
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  }}
                >
                  Previous
                </span>
              )}

              <span style={{ fontSize: '0.875rem', color: '#374151', padding: '0 0.5rem' }}>
                Page {currentPage} of {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={createQueryString({ page: currentPage + 1 })}
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#fff',
                    color: '#374151',
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  Next
                </Link>
              ) : (
                <span
                  style={{
                    padding: '0.375rem 0.75rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f3f4f6',
                    color: '#9ca3af',
                    fontSize: '0.875rem',
                  }}
                >
                  Next
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
