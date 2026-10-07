import { z } from 'zod';
import { db } from '@/db/client';
import { botHits } from '@/db/schema';
import { checkRateLimit } from '@/lib/rateLimit';
import { classifyBot, clientIp } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// Internal ingest called fire-and-forget from src/middleware.ts when a
// page-ish request carries a known crawler UA. Publicly reachable, so the
// bot name is derived server-side — clients can't self-label.
const botHitSchema = z.object({
  path: z.string().min(1).max(2000),
  ua: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const { allowed, retryAfterSeconds } = checkRateLimit(`bot-hit:${clientIp(req)}`, {
    capacity: 60,
    refillRate: 1,
  });
  if (!allowed) {
    return Response.json(
      { error: 'rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = botHitSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const botName = classifyBot(parsed.data.ua);
  if (!botName) {
    // Not a known crawler — nothing to record, but don't error: the
    // middleware only calls this for matched UAs anyway.
    return new Response(null, { status: 204 });
  }

  try {
    await db.insert(botHits).values({
      path: parsed.data.path.slice(0, 300),
      botName,
      ua: parsed.data.ua.slice(0, 300),
      host: req.headers.get('host')?.slice(0, 100) ?? null,
    });
  } catch (e) {
    console.error('[bot-hit] insert failed:', e);
  }

  return new Response(null, { status: 204 });
}
