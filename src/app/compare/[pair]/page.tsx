import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { db } from '@/db/client';
import { models, providers } from '@/db/schema';
import { eq, ilike, or, and } from 'drizzle-orm';
import CompareTable from '@/components/CompareTable';
import { ModelItem, parseVsSlug } from '@/lib/compare';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ pair: string }>;
}

async function loadPair(keys: [string, string]): Promise<ModelItem[]> {
  const conds = keys.map((k) => {
    const [p, s] = k.split('/');
    return and(ilike(providers.slug, p), ilike(models.slug, s));
  });
  const rows = await db
    .select({
      id: models.id,
      name: models.name,
      contextWindow: models.contextWindow,
      inputPricePerM: models.inputPricePerM,
      outputPricePerM: models.outputPricePerM,
      modalityTags: models.modalityTags,
      status: models.status,
      lastSeenAt: models.lastSeenAt,
      updatedAt: models.updatedAt,
      providerName: providers.name,
      providerSlug: providers.slug,
      slug: models.slug,
    })
    .from(models)
    .innerJoin(providers, eq(models.providerId, providers.id))
    .where(or(...conds));

  // Restore the slug order from the URL so the table reads A vs B.
  const ordered: ModelItem[] = [];
  for (const key of keys) {
    const [p, s] = key.split('/');
    const found = rows.find(
      (r: ModelItem) => r.providerSlug.toLowerCase() === p && r.slug.toLowerCase() === s
    );
    if (!found) return [];
    ordered.push({ ...found, modalityTags: found.modalityTags || [] });
  }
  return ordered;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pair } = await params;
  const keys = parseVsSlug(pair);
  if (!keys) return { title: 'Compare models — modelright' };
  const [a, b] = keys;
  const canonical = `/compare/${pair}`;
  try {
    const pairModels = await loadPair(keys);
    if (pairModels.length === 2) {
      const [ma, mb] = pairModels;
      return {
        title: `${ma.name} vs ${mb.name}: specs & pricing — modelright`,
        description: `Side-by-side comparison of ${ma.name} (${ma.providerName}) and ${mb.name} (${mb.providerName}): context window, input/output pricing per 1M tokens, modalities, and estimated monthly cost.`,
        alternates: { canonical },
      };
    }
  } catch {
    // fall through to generic metadata; page 404s on load
  }
  return { title: `${a} vs ${b} — modelright`, alternates: { canonical } };
}

export default async function VsComparePage({ params }: PageProps) {
  const { pair } = await params;
  const keys = parseVsSlug(pair);
  if (!keys) notFound();

  let pairModels: ModelItem[] = [];
  try {
    pairModels = await loadPair(keys);
  } catch (error) {
    console.error('Failed to load compare pair:', error);
  }
  if (pairModels.length !== 2) notFound();

  const [a, b] = pairModels;
  const interactiveHref = `/compare?m=${encodeURIComponent(keys.join(','))}`;

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '1100px', margin: '0 auto' }}>
      <h1>
        {a.name} vs {b.name}
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
        {a.providerName} vs {b.providerName} — side-by-side specifications, pricing, and estimated usage cost.
      </p>

      <CompareTable selectedModels={pairModels} />

      <p>
        <Link href={interactiveHref} style={{ color: '#38bdf8', textDecoration: 'none' }}>
          Open in the interactive compare tool →
        </Link>
      </p>
    </main>
  );
}
