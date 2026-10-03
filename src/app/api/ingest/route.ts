import { timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { db } from '@/db/client';
import { providers, models, ingestLog, modelSnapshots } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/rateLimit';

const modelItemSchema = z.object({
  provider: z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
  }),
  slug: z.string().min(1),
  name: z.string().min(1),
  contextWindow: z.number().int().positive(),
  inputPricePerM: z.number().nonnegative().or(z.string()),
  outputPricePerM: z.number().nonnegative().or(z.string()),
  modalityTags: z.array(z.string()).optional().default([]),
  availability: z.string().optional().default('available'),
});

const ingestPayloadSchema = z.object({
  source: z.string().min(1).optional().default('api'),
  models: z.array(modelItemSchema),
});

function verifyBearerToken(req: Request): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  const expectedToken = process.env.INGEST_TOKEN;
  if (!expectedToken) {
    return false;
  }

  const tokenBuf = Buffer.from(token);
  const expectedBuf = Buffer.from(expectedToken);

  if (tokenBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(tokenBuf, expectedBuf);
}

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

  const { source, models: modelItems } = parseResult.data;
  const receivedCount = modelItems.length;
  let upsertedCount = 0;

  try {
    for (const item of modelItems) {
      // 1. Ensure provider exists or insert it
      let providerRecord = await db.query.providers.findFirst({
        where: eq(providers.slug, item.provider.slug),
      });

      if (!providerRecord) {
        const [insertedProvider] = await db
          .insert(providers)
          .values({
            slug: item.provider.slug,
            name: item.provider.name,
          })
          .onConflictDoUpdate({
            target: providers.slug,
            set: {
              name: item.provider.name,
              updatedAt: new Date(),
            },
          })
          .returning();
        providerRecord = insertedProvider;
      }

      const inputPriceStr = item.inputPricePerM.toString();
      const outputPriceStr = item.outputPricePerM.toString();

      // 2. Upsert model by (provider_id, slug)
      let modelRecord = await db.query.models.findFirst({
        where: and(
          eq(models.providerId, providerRecord.id),
          eq(models.slug, item.slug)
        ),
      });

      const now = new Date();
      const isOk = item.availability === 'available' || item.availability === 'ok';
      const newStatus = isOk ? 'ok' : item.availability ? 'degraded' : 'unknown';

      if (modelRecord) {
        const [updatedModel] = await db
          .update(models)
          .set({
            name: item.name,
            contextWindow: item.contextWindow,
            inputPricePerM: inputPriceStr,
            outputPricePerM: outputPriceStr,
            modalityTags: item.modalityTags,
            lastSeenAt: now,
            ...(isOk ? { lastSeenOk: now } : {}),
            status: newStatus,
            updatedAt: now,
          })
          .where(eq(models.id, modelRecord.id))
          .returning();
        modelRecord = updatedModel;
      } else {
        const [insertedModel] = await db
          .insert(models)
          .values({
            providerId: providerRecord.id,
            slug: item.slug,
            name: item.name,
            contextWindow: item.contextWindow,
            inputPricePerM: inputPriceStr,
            outputPricePerM: outputPriceStr,
            modalityTags: item.modalityTags,
            lastSeenAt: now,
            ...(isOk ? { lastSeenOk: now } : {}),
            status: newStatus,
          })
          .returning();
        modelRecord = insertedModel;
      }

      upsertedCount++;

      // 3. Append model_snapshots row
      await db.insert(modelSnapshots).values({
        modelId: modelRecord.id,
        availability: item.availability,
        inputPricePerM: inputPriceStr,
        outputPricePerM: outputPriceStr,
        rawPayload: item,
      });
    }

    // 4. Append ingest_log row
    await db.insert(ingestLog).values({
      source,
      payloadCount: receivedCount,
      status: 'success',
    });

    return Response.json({
      received: receivedCount,
      upserted: upsertedCount,
    });
  } catch (err) {
    await db.insert(ingestLog).values({
      source,
      payloadCount: receivedCount,
      status: 'error',
    });

    return Response.json({ error: 'Internal server error', details: String(err) }, { status: 500 });
  }
}
