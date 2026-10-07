import type { Metadata } from 'next';
import Link from 'next/link';
import HeaderSearch from '@/components/HeaderSearch';
import { db } from '@/db/client';
import { ingestLog } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { formatFreshness } from '@/lib/freshness';

export const metadata: Metadata = {
  title: 'modelright',
  description: 'Model-driven application',
};

async function getFreshnessText() {
  try {
    const latestSync = await db
      .select({ createdAt: ingestLog.createdAt })
      .from(ingestLog)
      .where(eq(ingestLog.source, 'openrouter'))
      .orderBy(desc(ingestLog.createdAt))
      .limit(1);

    if (latestSync.length > 0) {
      return formatFreshness(latestSync[0].createdAt);
    }
  } catch (e) {
    // Fallback if DB isn't reached or empty
  }
  return formatFreshness(null);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const freshnessText = await getFreshnessText();

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header style={{ borderBottom: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '1rem 2rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
              <Link href="/models" style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#38bdf8', textDecoration: 'none' }}>
                modelright
              </Link>
              <nav style={{ display: 'flex', gap: '1.5rem' }}>
                <Link href="/models" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
                  Models
                </Link>
                <Link href="/providers" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
                  Providers
                </Link>
                <Link href="/compare" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
                  Compare
                </Link>
                <Link href="/calculator" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
                  Calculator
                </Link>
                <Link href="/changes" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: 500 }}>
                  Changes
                </Link>
              </nav>
            </div>
            <HeaderSearch />
          </div>
        </header>

        <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '2rem 1rem', boxSizing: 'border-box' }}>
          {children}
        </main>

        <footer style={{ borderTop: '1px solid #1e293b', backgroundColor: '#0f172a', padding: '1.5rem 2rem', marginTop: 'auto', color: '#64748b', fontSize: '0.875rem' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              &copy; {new Date().getFullYear()} modelright. AI model specification &amp; pricing registry.
              <span style={{ marginLeft: '1rem', color: '#475569' }}>{freshnessText}</span>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/changes" style={{ color: '#64748b', textDecoration: 'none' }}>
                Changes
              </Link>
              <Link href="/api" style={{ color: '#64748b', textDecoration: 'none' }}>
                API
              </Link>
              <a href="/agents.txt" style={{ color: '#64748b', textDecoration: 'none' }}>
                agents.txt
              </a>
              <a href="https://livegraph.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
                Built with LiveGraph
              </a>
              <a href="https://github.com/homezloco/modelright" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'none' }}>
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
