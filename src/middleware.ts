import { NextResponse } from 'next/server';
import type { NextRequest, NextFetchEvent } from 'next/server';
import { classifyBot } from '@/lib/analytics';

// Edge-runtime middleware (q-0042): AI/search crawlers never run the JS
// beacon, so page_views can't see them. Known-bot page fetches are
// recorded via a POST to /api/bot-hit wrapped in event.waitUntil — a bare
// fire-and-forget fetch is killed when the edge isolate freezes after the
// response. No db imports here (edge runtime).
export function middleware(req: NextRequest, event: NextFetchEvent) {
  const ua = req.headers.get('user-agent') ?? '';
  if (classifyBot(ua)) {
    // Self-fetch must use plain HTTP: req.url is rebuilt as
    // https://localhost:PORT behind the proxy, and TLS against the
    // local listener fails with ERR_SSL_WRONG_VERSION_NUMBER.
    const hitUrl = new URL('/api/bot-hit', req.url);
    hitUrl.protocol = 'http:';
    event.waitUntil(
      fetch(hitUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          path: req.nextUrl.pathname.slice(0, 300),
          ua: ua.slice(0, 500),
        }),
      }).catch((e) => console.log(`[mw] bot-hit FAIL ${req.nextUrl.pathname} ${String(e?.cause ?? e)}`))
    );
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
