import { ingestPayloadSchema } from '@/lib/ingest-schema';
import { checkRateLimit } from '@/lib/rateLimit';
import { processIngestPayload, verifyBearerToken } from '@/lib/ingest';



export async function POST(req: Request) {
  if (!verifyBearerToken(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = req.headers.get('authorization')!.substring(7);
  const { allowed, retryAfterSeconds } = checkRateLimit(token, {
    capacity: Number(process.env.RATE_LIMIT_CAPACITY || 10),
    refillRate: Number(process.env.RATE_LIMIT_REFILL_RATE || 1),
  });

  if (!allowed) {
    return Response.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfterSeconds.toString(),
        },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = ingestPayloadSchema.safeParse(body);
  if (!parseResult.success) {
    return Response.json({ error: 'Validation failed', details: parseResult.error.flatten() }, { status: 400 });
  }

  const { source, models } = parseResult.data;

  try {
    const result = await processIngestPayload(source, models);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}
