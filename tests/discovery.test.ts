import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TASK_RULES } from '../src/lib/picks';
import { MCP_TOOLS } from '../src/lib/agent-surface';

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

const { default: sitemap } = await import('../src/app/sitemap');
const { GET: llmsTxtGet } = await import('../src/app/llms.txt/route');
const { default: robots } = await import('../src/app/robots');

beforeEach(() => {
  sharedQueue = [];
});

describe('q-0040 sitemap discovery completeness', () => {
  it('includes the new static routes', async () => {
    sharedQueue = [[], []];
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ['/pick', '/changes', '/api', '/calculator', '/rankings']) {
      expect(urls.some((u) => u.endsWith(path))).toBe(true);
    }
  });

  it('includes /pick/{task} for every task rule', async () => {
    sharedQueue = [[], []];
    const urls = (await sitemap()).map((e) => e.url);
    const tasks = Object.keys(TASK_RULES);
    expect(tasks.length).toBeGreaterThan(0);
    for (const task of tasks) {
      expect(urls.some((u) => u.endsWith(`/pick/${task}`))).toBe(true);
    }
  });

  it('still includes model and vs-pair routes alongside the new ones', async () => {
    sharedQueue = [
      [{ slug: 'openai', updatedAt: new Date() }],
      [
        { providerSlug: 'openai', modelSlug: 'gpt-5-mini', inputPricePerM: '0.4', updatedAt: new Date() },
        { providerSlug: 'openai', modelSlug: 'gpt-4o-mini', inputPricePerM: '0.6', updatedAt: new Date() },
      ],
    ];
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.endsWith('/models/openai/gpt-5-mini'))).toBe(true);
    expect(urls.some((u) => u.includes('-vs-'))).toBe(true);
    expect(urls.some((u) => u.endsWith('/pick'))).toBe(true);
  });
});

describe('q-0040 llms.txt discovery completeness', () => {
  it('lists the REST endpoints, MCP tools, and new surfaces', async () => {
    const res = llmsTxtGet();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const body = await res.text();

    // REST endpoints
    for (const s of [
      'GET /api/v1/models',
      '/api/v1/models/{provider}/{slug}',
      '/api/models/search',
      '/changes/rss.xml',
    ]) {
      expect(body).toContain(s);
    }

    // MCP endpoint + all tool names
    expect(body).toContain('POST /api/mcp');
    for (const t of MCP_TOOLS) {
      expect(body).toContain(t.name);
    }

    // Task-pick pages
    expect(body).toContain('/pick');
    expect(body).toContain('/pick/{task}');
    expect(body).toContain('/rankings');
    for (const task of Object.keys(TASK_RULES)) {
      expect(body).toContain(task);
    }

    // Compare page forms
    expect(body).toContain('/compare?m=');
    expect(body).toContain('-vs-');

    // Agent discovery surface
    expect(body).toContain('/.well-known/agent-card.json');
  });
});

describe('q-0040 robots.txt does not block new surfaces', () => {
  it('has no disallow rules', () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    for (const rule of rules) {
      expect(rule?.disallow ?? []).toEqual([]);
    }
  });
});
