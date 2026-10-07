import type { Metadata } from 'next';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'API — modelright',
  description:
    'Public JSON API for the modelright catalog: model list, filters, pagination, and per-model detail with price snapshots.',
};

const code = (s: string) => (
  <pre
    style={{
      backgroundColor: '#0f172a',
      border: '1px solid #334155',
      borderRadius: '6px',
      padding: '0.875rem 1rem',
      overflowX: 'auto',
      fontSize: '0.85rem',
      color: '#e2e8f0',
    }}
  >
    {s}
  </pre>
);

export default function ApiDocsPage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '860px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>Public JSON API</h1>
      <p style={{ color: '#94a3b8' }}>
        Read-only access to the live catalog — same data as the site, synced hourly from OpenRouter. No
        auth. Responses are CORS-enabled (<code>Access-Control-Allow-Origin: *</code>) and cached for 5
        minutes.
      </p>

      <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>List models</h2>
      {code(`curl 'https://modelright.dev/api/v1/models'`)}
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        Returns <code>{'{ data, page, limit, total, pages }'}</code>. Filters mirror the{' '}
        <a href="/models" style={{ color: '#38bdf8' }}>/models</a> page:
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <tbody>
          {[
            ['provider', 'provider slug', 'provider=openai'],
            ['minContext', 'minimum context window (tokens)', 'minContext=200000'],
            ['maxInputPrice', 'maximum input $/1M', 'maxInputPrice=2'],
            ['modality', 'image | audio | video | file', 'modality=image'],
            ['freeOnly', 'only $0 models', 'freeOnly=1'],
            ['hideRemoved', 'default 1; set 0 to include removed', 'hideRemoved=0'],
            ['sort', 'price_in, price_in_desc, price_out, price_out_desc, name', 'sort=price_in'],
            ['page', 'page number (default 1)', 'page=2'],
            ['limit', 'rows per page, max 200 (default 50)', 'limit=100'],
          ].map(([name, desc, ex]) => (
            <tr key={name} style={{ borderBottom: '1px solid #1e293b' }}>
              <td style={{ padding: '0.5rem 1rem 0.5rem 0' }}>
                <code>{name}</code>
              </td>
              <td style={{ padding: '0.5rem 1rem', color: '#94a3b8' }}>{desc}</td>
              <td style={{ padding: '0.5rem 0' }}>
                <code>{ex}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {code(`curl 'https://modelright.dev/api/v1/models?minContext=200000&maxInputPrice=2&sort=price_in'`)}

      <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Model detail</h2>
      {code(`curl 'https://modelright.dev/api/v1/models/openai/gpt-5'`)}
      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
        Includes the last 30 price/availability snapshots. Unknown pairs return{' '}
        <code>404 {'{ error: "not_found" }'}</code>.
      </p>

      <h2 style={{ fontSize: '1.25rem', marginTop: '2rem' }}>Other machine surfaces</h2>
      <ul style={{ color: '#94a3b8', lineHeight: 1.8 }}>
        <li>
          <code>/api/models/search?q=…</code> — fuzzy name search
        </li>
        <li>
          <code>/api/mcp</code> — MCP endpoint (JSON-RPC)
        </li>
        <li>
          <code>/changes/rss.xml</code> — RSS feed of catalog changes
        </li>
        <li>
          <code>/llms.txt</code> — llms.txt manifest
        </li>
      </ul>
    </main>
  );
}
