import Link from 'next/link';
import { TASK_RULES, TaskCategory } from '@/lib/picks';

export const metadata = {
  title: 'Task Picks | Modelright',
  description: 'Curated top 10 AI models by task: Chat, Coding, Long Context, Vision, and Cheap Bulk.',
};

export default function PickIndexPage() {
  const categories: TaskCategory[] = ['chat', 'coding', 'long-context', 'vision', 'cheap-bulk'];

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Task Picks</h1>
        <p style={{ color: '#4b5563', fontSize: '1.05rem', lineHeight: 1.5 }}>
          Explore top-ranked AI models for specific use cases based on transparent rules, context window sizes, and pricing.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {categories.map((key) => {
          const rule = TASK_RULES[key];
          return (
            <div
              key={key}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                  <Link href={`/pick/${key}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {rule.title}
                  </Link>
                </h2>
                <p style={{ color: '#4b5563', fontSize: '0.925rem', marginBottom: '1rem', lineHeight: 1.4 }}>
                  {rule.description}
                </p>
                <div style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.825rem', color: '#6b7280' }}>
                  <strong>Rule:</strong> {rule.ruleText}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem' }}>
                <Link
                  href={`/pick/${key}`}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    textDecoration: 'none',
                  }}
                >
                  View Top 10 Picks &rarr;
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
