import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseVsSlug, vsPairPath, priceTier, buildVsPairs, type VsPairCandidate } from '../src/lib/compare';

let sharedQueue: unknown[][] = [];
function makeDb() {
  const queue = sharedQueue;
  const chain: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') {
          const rows = queue.shift() ?? [];
          return (resolve: (v: unknown) => void) => resolve(rows);
        }
        return () => chain;
      },
    }
  );
  return { select: () => chain, insert: () => chain, update: () => chain, delete: () => chain };
}

vi.mock('../src/db/client', () => ({ get db() { return makeDb(); } }));

const { default: VsComparePage, generateMetadata } = await import('../src/app/compare/[pair]/page');
const { default: sitemap } = await import('../src/app/sitemap');

const modelRow = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'm1', name: 'GPT-5', contextWindow: 400000,
  inputPricePerM: '2.5', outputPricePerM: '10', modalityTags: ['text'],
  status: 'ok', lastSeenAt: new Date(), updatedAt: new Date(),
  providerName: 'OpenAI', providerSlug: 'openai', slug: 'gpt-5',
  ...over,
});

beforeEach(() => {
  sharedQueue = [];
});

describe('q-0030 vs-slug helpers', () => {
  it('round-trips provider--slug-vs-provider--slug', () => {
    const path = vsPairPath('openai/gpt-4o', 'anthropic/claude-sonnet');
    expect(path).toBe('/compare/openai--gpt-4o-vs-anthropic--claude-sonnet');
    expect(parseVsSlug('openai--gpt-4o-vs-anthropic--claude-sonnet')).toEqual([
      'openai/gpt-4o',
      'anthropic/claude-sonnet',
    ]);
  });

  it('rejects malformed pairs', () => {
    expect(parseVsSlug('openai--gpt-4o')).toBeNull();
    expect(parseVsSlug('a-b-c')).toBeNull();
    expect(parseVsSlug('openai--vs-anthropic--x')).toBeNull();
    expect(parseVsSlug('openai--x-vs-anthropic--y-vs-z--w')).toBeNull();
  });

  it('buckets price tiers', () => {
    expect(priceTier('0')).toBe('free');
    expect(priceTier('0.4')).toBe('budget');
    expect(priceTier('5')).toBe('mid');
    expect(priceTier('60')).toBe('premium');
    expect(priceTier('abc')).toBe('unknown');
  });
});

describe('q-0030 sitemap pair selection', () => {
  const cand = (slug: string, price: string, ageDays: number): VsPairCandidate => ({
    providerSlug: 'p', slug, inputPricePerM: price,
    updatedAt: new Date(Date.now() - ageDays * 86400e3),
  });

  it('pairs only same-tier models from the recent set', () => {
    const pairs = buildVsPairs([
      cand('a', '0.5', 1), cand('b', '0.6', 2), cand('c', '0.7', 3), // budget
      cand('x', '50', 1), cand('y', '55', 2),                       // premium
    ]);
    expect(pairs).toContain('/compare/p--a-vs-p--b');
    expect(pairs).toContain('/compare/p--x-vs-p--y');
    expect(pairs).not.toContain('/compare/p--a-vs-p--x'); // cross-tier
    expect(pairs).toHaveLength(3 + 1); // C(3,2) + C(2,2)
  });

  it('respects the recentCount window and maxPairs cap', () => {
    const many = Array.from({ length: 40 }, (_, i) => cand(`m${i}`, '0.5', i));
    const capped = buildVsPairs(many, { recentCount: 30, maxPairs: 10 });
    expect(capped).toHaveLength(10);
    // stalest 10 models are outside the recent window
    expect(capped.some((p) => p.includes('m39'))).toBe(false);
  });
});

describe('q-0030 /compare/[pair] route', () => {
  const params = (pair: string) => ({ params: Promise.resolve({ pair }) });

  it('renders the compare view for a valid pair', async () => {
    sharedQueue = [[modelRow(), modelRow({ id: 'm2', name: 'Claude Opus 4.8', providerName: 'Anthropic', providerSlug: 'anthropic', slug: 'claude-opus-4.8' })]];
    const el = await VsComparePage(params('openai--gpt-5-vs-anthropic--claude-opus-4.8'));
    expect(el).toBeTruthy();
  });

  it('404s on an unknown pair', async () => {
    sharedQueue = [[]];
    await expect(VsComparePage(params('nope--x-vs-nah--y'))).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('emits canonical metadata for a valid pair', async () => {
    sharedQueue = [[modelRow(), modelRow({ id: 'm2', providerSlug: 'anthropic', slug: 'claude-opus-4.8', providerName: 'Anthropic', name: 'Claude Opus 4.8' })]];
    const meta = await generateMetadata(params('openai--gpt-5-vs-anthropic--claude-opus-4.8'));
    expect(meta.title).toContain('vs');
    expect(meta.alternates?.canonical).toBe('/compare/openai--gpt-5-vs-anthropic--claude-opus-4.8');
  });
});

describe('q-0030 sitemap route', () => {
  it('includes capped vs-pair URLs', async () => {
    sharedQueue = [
      [{ slug: 'openai', updatedAt: new Date() }],
      [
        { providerSlug: 'openai', modelSlug: 'gpt-5-mini', inputPricePerM: '0.4', updatedAt: new Date() },
        { providerSlug: 'openai', modelSlug: 'gpt-4o-mini', inputPricePerM: '0.6', updatedAt: new Date() },
        { providerSlug: 'anthropic', modelSlug: 'claude-opus-4.8', inputPricePerM: '15', updatedAt: new Date() },
      ],
    ];
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls.some((u) => u.includes('/compare/') && u.includes('-vs-'))).toBe(true);
    const pairUrls = urls.filter((u) => u.includes('-vs-'));
    expect(pairUrls.length).toBeLessThanOrEqual(60);
  });
});
