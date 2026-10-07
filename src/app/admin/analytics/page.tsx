import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { db } from '@/db/client';
import { pageViews, botHits, mcpCalls } from '@/db/schema';
import { gte } from 'drizzle-orm';
import { verifyTokenParam } from '@/lib/admin-stats';
import {
  isHumanView,
  mcpCallLabel,
  topBy,
  viewsPerDay,
  type BotHitRow,
  type McpCallRow,
  type PageViewRow,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin — Analytics',
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ token?: string | string[] | undefined }>;
}

const WINDOW_DAYS = 30;

const card: CSSProperties = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '0.5rem',
  padding: '1rem',
};

const cardLabel: CSSProperties = {
  fontSize: '0.8rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cardValue: CSSProperties = {
  fontSize: '1.75rem',
  fontWeight: 700,
  color: '#f8fafc',
  marginTop: '0.25rem',
};

const sectionTitle: CSSProperties = {
  fontSize: '1.125rem',
  fontWeight: 700,
  color: '#cbd5e1',
  marginTop: '2rem',
  marginBottom: '0.75rem',
};

const th: CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  fontSize: '0.8rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #334155',
};

const td: CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderBottom: '1px solid #1e293b',
  fontSize: '0.9rem',
  color: '#cbd5e1',
};

/** Inline SVG bar chart — server-rendered, no client JS. */
function DayBars({ data, color, title }: { data: Array<{ date: string; n: number }>; color: string; title: string }) {
  const width = 600;
  const height = 80;
  const max = Math.max(1, ...data.map((d) => d.n));
  const bw = width / Math.max(1, data.length);
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: `${width}px`, height: 'auto', display: 'block' }}
    >
      <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="#475569" />
      {data.map((d, i) => {
        const h = (d.n / max) * (height - 8);
        return (
          <rect key={d.date} x={i * bw + 1} y={height - h} width={Math.max(1, bw - 2)} height={h} fill={color}>
            <title>{`${d.date}: ${d.n}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}

function TopTable({ rows, label }: { rows: Array<{ key: string; n: number }>; label: string }) {
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>{label}</th>
            <th style={{ ...th, textAlign: 'right' }}>Hits</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td style={td} colSpan={2}>
                <span style={{ color: '#64748b' }}>No data in window.</span>
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key}>
                <td style={{ ...td, fontFamily: 'monospace', wordBreak: 'break-all' }}>{r.key}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAnalyticsPage(props: PageProps) {
  const sp = await props.searchParams;
  if (!verifyTokenParam(sp.token, process.env.ADMIN_TOKEN)) {
    notFound();
  }
  const token = typeof sp.token === 'string' ? sp.token : '';

  let viewRows: PageViewRow[] = [];
  let botRows: BotHitRow[] = [];
  let mcpRows: McpCallRow[] = [];
  let dbError: string | null = null;

  if (process.env.DATABASE_URL) {
    try {
      const since = new Date(Date.now() - WINDOW_DAYS * 86400_000);
      [viewRows, botRows, mcpRows] = await Promise.all([
        db
          .select({
            ts: pageViews.ts,
            path: pageViews.path,
            visitor: pageViews.visitor,
            refDomain: pageViews.refDomain,
            device: pageViews.device,
            suspect: pageViews.suspect,
            headless: pageViews.headless,
          })
          .from(pageViews)
          .where(gte(pageViews.ts, since)),
        db
          .select({ botName: botHits.botName })
          .from(botHits)
          .where(gte(botHits.ts, since)),
        db
          .select({ method: mcpCalls.method, tool: mcpCalls.tool, ok: mcpCalls.ok })
          .from(mcpCalls)
          .where(gte(mcpCalls.ts, since)),
      ]);
    } catch (err) {
      dbError = String(err);
    }
  } else {
    dbError = 'DATABASE_URL not configured';
  }

  const daily = viewsPerDay(viewRows, WINDOW_DAYS);
  const humans = viewRows.filter(isHumanView);
  const totalViews = humans.length;
  const totalUniques = new Set(humans.map((r) => r.visitor).filter(Boolean)).size;
  const topPaths = topBy(humans, (r) => r.path, 15);
  const topRefs = topBy(humans, (r) => r.refDomain ?? '(direct / none)', 15);
  const topBots = topBy(botRows, (r) => r.botName, 15);
  const topTools = topBy(mcpRows, mcpCallLabel, 15);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
        Admin — Analytics
      </h1>
      <p style={{ color: '#94a3b8', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        Cookieless page views, crawler hits, and MCP-call counts — last {WINDOW_DAYS} days.{' '}
        <Link href={`/admin?token=${encodeURIComponent(token)}`} style={{ color: '#38bdf8' }}>
          ← ops dashboard
        </Link>
      </p>

      {dbError && (
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#94a3b8',
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
          }}
        >
          DB read failed — showing empty stats. {dbError}
        </div>
      )}

      <section>
        <h2 style={sectionTitle}>Traffic</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
          }}
        >
          <div style={card}>
            <div style={cardLabel}>Human views (30d)</div>
            <div style={cardValue}>{totalViews}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Unique visitors (30d)</div>
            <div style={cardValue}>{totalUniques}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>Bot hits (30d)</div>
            <div style={cardValue}>{botRows.length}</div>
          </div>
          <div style={card}>
            <div style={cardLabel}>MCP calls (30d)</div>
            <div style={cardValue}>{mcpRows.length}</div>
          </div>
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Views per day</h2>
        <div style={card}>
          <DayBars
            title="Views per day"
            color="#38bdf8"
            data={daily.map((d) => ({ date: d.date, n: d.views }))}
          />
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            {daily[0]?.date} → {daily[daily.length - 1]?.date} (UTC)
          </div>
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Unique visitors per day</h2>
        <div style={card}>
          <DayBars
            title="Unique visitors per day"
            color="#34d399"
            data={daily.map((d) => ({ date: d.date, n: d.uniques }))}
          />
        </div>
      </section>

      <section>
        <h2 style={sectionTitle}>Top paths</h2>
        <TopTable label="Path" rows={topPaths} />
      </section>

      <section>
        <h2 style={sectionTitle}>Top referrers</h2>
        <TopTable label="Domain" rows={topRefs} />
      </section>

      <section>
        <h2 style={sectionTitle}>Bot hits by crawler</h2>
        <TopTable label="Crawler" rows={topBots} />
      </section>

      <section>
        <h2 style={sectionTitle}>MCP calls by tool</h2>
        <TopTable label="Tool / method" rows={topTools} />
      </section>
    </div>
  );
}
