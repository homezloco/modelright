import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Chainable drizzle-client stub: every builder method returns itself until
 * awaited, then resolves to the queued row sets in order.
 */
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
vi.mock('next/link', () => ({
  __esModule: true,
  default: (props: any) =>
    createElement('a', { href: props.href, style: props.style }, props.children),
}));

const { default: RankingsPage } = await import('../src/app/rankings/page');

const aaPayload = (bench: Record<string, number>, speed: Record<string, number> = {}) => ({
  source: 'artificial-analysis',
  benchmarks: bench,
  speed,
});

const modelRow = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  name: 'GPT-5',
  slug: 'gpt-5',
  status: 'ok',
  inputPricePerM: '2.5',
  outputPricePerM: '10',
  providerName: 'OpenAI',
  providerSlug: 'openai',
  ...over,
});

beforeEach(() => {
  sharedQueue = [];
});

describe('q-0043 /rankings route', () => {
  it('renders all four leaderboard tables with rank, score, and joined prices', async () => {
    sharedQueue = [
      [
        modelRow(),
        modelRow({ id: 'm2', name: 'Claude Opus', slug: 'claude-opus', providerName: 'Anthropic', providerSlug: 'anthropic', inputPricePerM: '15', outputPricePerM: '75' }),
        modelRow({ id: 'm3', name: 'Unranked Model', slug: 'unranked', providerSlug: 'misc' }),
      ],
      [
        { modelId: 'm1', rawPayload: aaPayload({ artificial_analysis_intelligence_index: 68.1, artificial_analysis_coding_index: 61.2 }, { outputTokensPerSecond: 142.4, ttftSeconds: 0.41 }) },
        { modelId: 'm2', rawPayload: aaPayload({ artificial_analysis_intelligence_index: 80.4, artificial_analysis_coding_index: 77.8 }, { outputTokensPerSecond: 60.2, ttftSeconds: 0.28 }) },
      ],
    ];

    const html = renderToStaticMarkup(await RankingsPage());

    for (const title of ['Intelligence Index', 'Coding Index', 'Output Speed', 'Time to First Token']) {
      expect(html).toContain(title);
    }

    // Higher intelligence index ranks first inside the intelligence table
    const section = html.slice(html.indexOf('Intelligence Index'));
    expect(section.indexOf('Claude Opus')).toBeLessThan(section.indexOf('GPT-5'));
    expect(html).toContain('#1');
    expect(html).toContain('$2.50');
    expect(html).toContain('$75.00');
    expect(html).toContain('/models/anthropic/claude-opus');

    // Models without benchmark data never rank
    expect(html).not.toContain('Unranked Model');
  });

  it('renders the graceful empty state when no AA data exists', async () => {
    sharedQueue = [[], []];
    const html = renderToStaticMarkup(await RankingsPage());
    expect(html).toContain('No benchmark data yet');
    expect(html).not.toContain('<table');
  });

  it('shows a per-dimension empty note when only some metrics exist', async () => {
    sharedQueue = [
      [modelRow()],
      [{ modelId: 'm1', rawPayload: aaPayload({ artificial_analysis_intelligence_index: 68.1 }) }],
    ];
    const html = renderToStaticMarkup(await RankingsPage());
    expect(html).toContain('GPT-5'); // ranked on intelligence
    expect(html).toContain('No models carry this metric yet.');
  });
});
