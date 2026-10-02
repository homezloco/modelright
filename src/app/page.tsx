import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <section style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Real-time AI Model Specs, Context Windows & Pricing
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#4a5568', lineHeight: 1.6, maxWidth: '650px', margin: '0 auto 2rem' }}>
          Modelright is a live registry tracking AI model specifications, context window sizes, and pricing per 1M tokens across top providers.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link
            href="/models"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Explore Models &rarr;
          </Link>
          <Link
            href="/compare"
            style={{
              backgroundColor: '#f3f4f6',
              color: '#1f2937',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.375rem',
              fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid #e5e7eb'
            }}
          >
            Compare Side-by-Side
          </Link>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Live Registry</h2>
          <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.5 }}>
            Continuously updated specs and per-million token pricing across LLMs and vision models.
          </p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Automated Ingest Feed</h2>
          <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.5 }}>
            Entries update automatically via provider ingest feeds and pricing/availability snapshots.
          </p>
        </div>
        <div style={{ padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', backgroundColor: '#f9fafb' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Freshness Tracking</h2>
          <p style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: 1.5 }}>
            Status indicators (OK, degraded, unknown) keep you informed on current provider availability.
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
        Built with Next.js 14 • Drizzle ORM • PostgreSQL
      </footer>
    </main>
  );
}
