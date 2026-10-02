import Link from 'next/link';

interface ComparePageProps {
  searchParams: {
    a?: string;
    b?: string;
  };
}

// Fallback or placeholder models used when database records aren't populated yet
const SAMPLE_MODELS = [
  {
    id: 'openai/gpt-4o',
    provider: 'OpenAI',
    slug: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    inputPricePerM: '$2.50',
    outputPricePerM: '$10.00',
    modalities: 'text, image, audio',
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    provider: 'Anthropic',
    slug: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputPricePerM: '$3.00',
    outputPricePerM: '$15.00',
    modalities: 'text, image',
  },
  {
    id: 'openrouter/meta-llama-3-70b-instruct',
    provider: 'OpenRouter',
    slug: 'meta-llama-3-70b-instruct',
    name: 'Meta Llama 3 70B Instruct',
    contextWindow: 8192,
    inputPricePerM: '$0.59',
    outputPricePerM: '$0.79',
    modalities: 'text',
  },
];

function parseModelParam(param?: string) {
  if (!param) return null;
  const parts = param.split('/');
  if (parts.length !== 2) return null;
  const [provider, slug] = parts;
  if (!provider || !slug) return null;
  return { provider: provider.toLowerCase(), slug: slug.toLowerCase() };
}

export default function ComparePage({ searchParams }: ComparePageProps) {
  const modelAKey = parseModelParam(searchParams.a);
  const modelBKey = parseModelParam(searchParams.b);

  const modelA = modelAKey
    ? SAMPLE_MODELS.find(
        (m) =>
          m.provider.toLowerCase() === modelAKey.provider &&
          m.slug.toLowerCase() === modelAKey.slug
      )
    : null;

  const modelB = modelBKey
    ? SAMPLE_MODELS.find(
        (m) =>
          m.provider.toLowerCase() === modelBKey.provider &&
          m.slug.toLowerCase() === modelBKey.slug
      )
    : null;

  const showComparison = modelA && modelB;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <h1>Compare Models</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Compare specifications, pricing, and capabilities side-by-side.
      </p>

      {showComparison ? (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <Link href="/compare" style={{ color: '#0066cc', textDecoration: 'none' }}>
              ← Reset comparison / Pick different models
            </Link>
          </div>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid #e5e7eb',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', width: '30%' }}>Spec / Metric</th>
                <th style={{ padding: '0.75rem 1rem', width: '35%' }}>{modelA.name} ({modelA.provider})</th>
                <th style={{ padding: '0.75rem 1rem', width: '35%' }}>{modelB.name} ({modelB.provider})</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Provider</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.provider}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.provider}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Slug</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.slug}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.slug}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Context Window</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.contextWindow.toLocaleString()} tokens</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.contextWindow.toLocaleString()} tokens</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Input Price (per 1M)</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.inputPricePerM}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.inputPricePerM}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Output Price (per 1M)</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.outputPricePerM}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.outputPricePerM}</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Modalities</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelA.modalities}</td>
                <td style={{ padding: '0.75rem 1rem' }}>{modelB.modalities}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Select Models to Compare</h2>
          {(!modelAKey || !modelBKey) && (
            <p style={{ color: '#d97706', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Please select two valid models from the available options below to view a side-by-side comparison.
            </p>
          )}

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Preset Comparisons</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.8' }}>
              <li>
                <Link href="/compare?a=openai/gpt-4o&b=anthropic/claude-3-5-sonnet" style={{ color: '#0066cc' }}>
                  OpenAI GPT-4o vs Anthropic Claude 3.5 Sonnet
                </Link>
              </li>
              <li>
                <Link href="/compare?a=openai/gpt-4o&b=openrouter/meta-llama-3-70b-instruct" style={{ color: '#0066cc' }}>
                  OpenAI GPT-4o vs Meta Llama 3 70B Instruct
                </Link>
              </li>
            </ul>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Available Models</h3>
            <ul style={{ paddingLeft: '1.25rem', lineHeight: '1.6' }}>
              {SAMPLE_MODELS.map((model) => (
                <li key={model.id}>
                  <strong>{model.name}</strong> ({model.provider}/{model.slug})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
