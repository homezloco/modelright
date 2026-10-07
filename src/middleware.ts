import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { classifyBot } from '@/lib/analytics';

// Edge-runtime middleware (q-0042): AI/search crawlers never run the JS
// beacon, so page_views can't see them. Known-bot page fetches are
// recorded by a fire-and-forget POST to /api/bot-hit — never awaited,
// never blocking the response. No db imports here (edge runtime).
export function middleware(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (classifyBot(ua)) {
    void fetch(new URL('/api/bot-hit', req.url), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: req.nextUrl.pathname.slice(0, 300),
        ua: ua.slice(0, 500),
      }),
    }).catch(() => {
      /* analytics must never break a request */
    });
  }
  return NextResponse.next();
}

export const config = {
  // Page-ish paths only: exclude API routes, Next internals, and static
  // files with extensions. Discovery files are added back explicitly —
  // bots fetch .well-known/llms.txt/agents.txt/sitemap/robots and those
  // hits are exactly what we want counted.
  matcher: [
    '/((?!api|_next|.*\\.[a-z0-9]+$).*)',
    '/.well-known/:path*',
    '/llms.txt',
    '/agents.txt',
    '/sitemap.xml',
    '/robots.txt',
  ],
};
