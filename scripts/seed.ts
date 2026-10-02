import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/db/schema';
import {
  eq,
  and,
} from 'drizzle-orm';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required to run seed script.');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

const SEED_PROVIDERS = [
  { slug: 'openai', name: 'OpenAI' },
  { slug: 'anthropic', name: 'Anthropic' },
  { slug: 'openrouter', name: 'OpenRouter' },
];

const SEED_MODELS = [
  {
    providerSlug: 'openai',
    slug: 'gpt-4o',
    name: 'GPT-4o',
    contextWindow: 128000,
    inputPricePerM: '2.50',
    outputPricePerM: '10.00',
    modalityTags: ['text', 'vision'],
  },
  {
    providerSlug: 'openai',
    slug: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    contextWindow: 128000,
    inputPricePerM: '0.15',
    outputPricePerM: '0.60',
    modalityTags: ['text', 'vision'],
  },
  {
    providerSlug: 'openai',
    slug: 'o1',
    name: 'o1',
    contextWindow: 200000,
    inputPricePerM: '15.00',
    outputPricePerM: '60.00',
    modalityTags: ['text', 'reasoning'],
  },
  {
    providerSlug: 'openai',
    slug: 'o3-mini',
    name: 'o3-mini',
    contextWindow: 200000,
    inputPricePerM: '1.10',
    outputPricePerM: '4.40',
    modalityTags: ['text', 'reasoning'],
  },
  {
    providerSlug: 'anthropic',
    slug: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200000,
    inputPricePerM: '3.00',
    outputPricePerM: '15.00',
    modalityTags: ['text', 'vision'],
  },
  {
    providerSlug: 'anthropic',
    slug: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200000,
    inputPricePerM: '1.00',
    outputPricePerM: '5.00',
    modalityTags: ['text'],
  },
  {
    providerSlug: 'anthropic',
    slug: 'claude-3-opus',
    name: 'Claude 3 Opus',
    contextWindow: 200000,
    inputPricePerM: '15.00',
    outputPricePerM: '75.00',
    modalityTags: ['text', 'vision'],
  },
  {
    providerSlug: 'openrouter',
    slug: 'auto',
    name: 'Auto Router',
    contextWindow: 128000,
    inputPricePerM: '0.00',
    outputPricePerM: '0.00',
    modalityTags: ['text', 'router'],
  },
  {
    providerSlug: 'openrouter',
    slug: 'deepseek-r1',
    name: 'DeepSeek R1 (via OpenRouter)',
    contextWindow: 164000,
    inputPricePerM: '0.55',
    outputPricePerM: '2.19',
    modalityTags: ['text', 'reasoning'],
  },
  {
    providerSlug: 'openrouter',
    slug: 'meta-llama-3-3-70b-instruct',
    name: 'Llama 3.3 70B Instruct (via OpenRouter)',
    contextWindow: 128000,
    inputPricePerM: '0.12',
    outputPricePerM: '0.30',
    modalityTags: ['text'],
  },
];

async function seed() {
  console.log('Starting seed process...');

  try {
    // Insert/upsert providers
    const providerMap = new Map<string, string>();
    for (const p of SEED_PROVIDERS) {
      const existing = await db
        .select()
        .from(schema.providers)
        .where(eq(schema.providers.slug, p.slug))
        .limit(1);

      if (existing.length > 0) {
        providerMap.set(p.slug, existing[0].id);
        console.log(`Provider exists: ${p.name}`);
      } else {
        const [inserted] = await db
          .insert(schema.providers)
          .values({
            slug: p.slug,
            name: p.name,
          })
          .returning();
        providerMap.set(p.slug, inserted.id);
        console.log(`Inserted provider: ${p.name}`);
      }
    }

    // Insert/upsert models and snapshots
    for (const m of SEED_MODELS) {
      const providerId = providerMap.get(m.providerSlug);
      if (!providerId) {
        console.error(`Provider ID not found for slug: ${m.providerSlug}`);
        continue;
      }

      const existingModel = await db
        .select()
        .from(schema.models)
        .where(
          and(
            eq(schema.models.providerId, providerId),
            eq(schema.models.slug, m.slug)
          )
        )
        .limit(1);

      let modelId: string;
      if (existingModel.length > 0) {
        modelId = existingModel[0].id;
        await db
          .update(schema.models)
          .set({
            name: m.name,
            contextWindow: m.contextWindow,
            inputPricePerM: m.inputPricePerM,
            outputPricePerM: m.outputPricePerM,
            modalityTags: m.modalityTags,
            updatedAt: new Date(),
          })
          .where(eq(schema.models.id, modelId));
        console.log(`Updated model: ${m.name}`);
      } else {
        const [insertedModel] = await db
          .insert(schema.models)
          .values({
            providerId,
            slug: m.slug,
            name: m.name,
            contextWindow: m.contextWindow,
            inputPricePerM: m.inputPricePerM,
            outputPricePerM: m.outputPricePerM,
            modalityTags: m.modalityTags,
          })
          .returning();
        modelId = insertedModel.id;
        console.log(`Inserted model: ${m.name}`);
      }

      // Create snapshot
      await db.insert(schema.modelSnapshots).values({
        modelId,
        capturedAt: new Date(),
        availability: 'available',
        inputPricePerM: m.inputPricePerM,
        outputPricePerM: m.outputPricePerM,
      });
      console.log(`Created snapshot for model: ${m.name}`);
    }

    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
