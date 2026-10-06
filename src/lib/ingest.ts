import { timingSafeEqual } from 'crypto';
import { db } from '@/db/client';
import { providers, models, ingestLog, modelSnapshots } from '@/db/schema';
import { eq, and, notInArray } from 'drizzle-orm';
import { fetchOpenRouterCatalog, normalizeOpenRouter } from '@/lib/sources/openrouter';

export interface IngestModelItem {
  provider: {
    slug: string;
    name: string;
  };
  slug: string;
  name: string;
  contextWindow: number;
  inputPricePerM: number | string;
  outputPricePerM: number | string;
  modalityTags?: string[];
  availability?: string;
}

export async function processIngestPayload(source: string, modelItems: IngestModelItem[]): Promise<{ received: number; upserted: number }> {
  const receivedCount = modelItems.length;
  let upsertedCount = 0;

  try {
    for (const item of modelItems) {
      const providerRecords = await db
        .select()
        .from(providers)
        .where(eq(providers.slug, item.provider.slug))
        .limit(1);
      let providerRecord = providerRecords[0];

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

      const modelRecords = await db
        .select()
        .from(models)
        .where(
          and(
            eq(models.providerId, providerRecord.id),
            eq(models.slug, item.slug)
          )
        )
        .limit(1);
      let modelRecord = modelRecords[0];

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
            modalityTags: item.modalityTags || [],
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
            modalityTags: item.modalityTags || [],
            lastSeenAt: now,
            ...(isOk ? { lastSeenOk: now } : {}),
            status: newStatus,
          })
          .returning();
        modelRecord = insertedModel;
      }

      upsertedCount++;

      await db.insert(modelSnapshots).values({
        modelId: modelRecord.id,
        availability: item.availability || 'available',
        inputPricePerM: inputPriceStr,
        outputPricePerM: outputPriceStr,
        rawPayload: item,
      });
    }

    await db.insert(ingestLog).values({
      source,
      payloadCount: receivedCount,
      status: 'success',
    });

    return {
      received: receivedCount,
      upserted: upsertedCount,
    };
  } catch (err) {
    await db.insert(ingestLog).values({
      source,
      payloadCount: receivedCount,
      status: 'error',
    });

    throw err;
  }
}

export async function syncOpenRouterCatalog(): Promise<{ fetched: number; upserted: number; removed: number }> {
  const rawModels = await fetchOpenRouterCatalog();
  const normalized = normalizeOpenRouter(rawModels);
  const fetchedCount = rawModels.length;

  const { upserted } = await processIngestPayload('openrouter', normalized);

  let removedCount = 0;
  if (normalized.length > 0) {
    // Collect active (providerSlug, modelSlug) keys
    const activeKeys = new Set(normalized.map((item) => `${item.provider.slug}/${item.slug}`));

    // Find all existing models that came from or were updated by 'openrouter'
    // To identify models from source openrouter or current active models:
    const allModels = await db
      .select({
        id: models.id,
        slug: models.slug,
        status: models.status,
        providerSlug: providers.slug,
      })
      .from(models)
      .innerJoin(providers, eq(models.providerId, providers.id));

    const toRemoveIds: string[] = [];
    for (const m of allModels) {
      const key = `${m.providerSlug}/${m.slug}`;
      if (!activeKeys.has(key) && m.status !== 'removed') {
        toRemoveIds.push(m.id);
      }
    }

    if (toRemoveIds.length > 0) {
      for (const id of toRemoveIds) {
        await db
          .update(models)
          .set({ status: 'removed', updatedAt: new Date() })
          .where(eq(models.id, id));
        removedCount++;
      }
    }
  }

  return {
    fetched: fetchedCount,
    upserted,
    removed: removedCount,
  };
}

export function verifyBearerToken(req: Request): boolean {
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

export function verifyCronSecret(req: Request): 'ok' | 'unset' | 'unauthorized' {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return 'unset';
  }

  const headerSecret = req.headers.get('x-cron-secret');
  if (!headerSecret) {
    return 'unauthorized';
  }

  const headerBuf = Buffer.from(headerSecret);
  const secretBuf = Buffer.from(cronSecret);

  if (headerBuf.length !== secretBuf.length) {
    return 'unauthorized';
  }

  if (timingSafeEqual(headerBuf, secretBuf)) {
    return 'ok';
  }

  return 'unauthorized';
}
