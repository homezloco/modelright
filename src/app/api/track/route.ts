import { z } from 'zod';
import { db } from '@/db/client';
import { pageViews } from '@/db/schema';
import { checkRateLimit } from '@/lib/rateLimit';
import {
  analyticsSalt,
  canonicalAnalyticsPath,
  clientIp,
  DISPLAY_MODES,
  isHeadless,
  parseUA,
  refDomain,
  visitorHash,
} from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// Beacon payload — all fields optional except path. The sendBeacon body
// arrives as text/plain; req.json() parses it regardless of content-type.
const trackSchema = z.object({
  path: z.string().min(1).max(2000).startsWith('/'),
  referrer: z.string().max(500).optional(),
  screen: z.string().max(20).optional(),
  viewport: z.string().max(20).optional(),
  tz: z.string().max(60).optional(),
  display: z.string().max(20).optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

// Wildcard CORS: the beacon is a public, unauthenticated ingest — same
// stance as the read-only /api/mcp surface.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(req: Request) {
  const ip = clientIp(req);
  // Modest per-IP budget — beacons are ~1 per pageview, so 30 burst is
  // generous for a human session and throttles beacon floods.
  const { allowed, retryAfterSeconds } = checkRateLimit(`track:${ip}`, {
    capacity: 30,
    refillRate: 1,
  });
  if (!allowed) {
    return Response.json(
      { error: 'rate limit exceeded' },
      { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400, headers: CORS_HEADERS });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid payload', details: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  const input = parsed.data;

  const ua = req.headers.get('user-agent') ?? '';
  const { device, browser, os } = parseUA(ua);
  const path = canonicalAnalyticsPath(input.path).slice(0, 300);
  const referrer = input.referrer?.slice(0, 500) ?? null;
  const display = input.display && DISPLAY_MODES.has(input.display) ? input.display : null;
  const country =
    req.headers.get('x-vercel-ip-country') ?? req.headers.get('cf-ipcountry') ?? null;

  try {
    await db.insert(pageViews).values({
      path,
      referrer,
      refDomain: refDomain(referrer),
      visitor: await visitorHash(
        ip,
        ua,
        new Date().toISOString().slice(0, 10),
        analyticsSalt()
      ),
      device,
      browser,
      os,
      lang: req.headers.get('accept-language')?.split(',')[0]?.slice(0, 16) ?? null,
      screen: input.screen ?? null,
      viewport: input.viewport ?? null,
      tz: input.tz ?? null,
      display,
      country: country?.slice(0, 8) ?? null,
      host: req.headers.get('host')?.slice(0, 100) ?? null,
      utmSource: input.utm_source ?? null,
      utmMedium: input.utm_medium ?? null,
      utmCampaign: input.utm_campaign ?? null,
      // No geo-vs-tz table in this repo — suspect stays NULL (unevaluated).
      suspect: null,
      headless: isHeadless({ ...input, display: display ?? undefined }) ? 1 : 0,
    });
  } catch (e) {
    // Analytics must never surface a failure to the beacon — log and 204.
    console.error('[track] page_views insert failed:', e);
  }

  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
