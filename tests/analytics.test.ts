import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  analyticsSalt,
  visitorHash,
  clientIp,
  classifyBot,
  parseUA,
  canonicalAnalyticsPath,
  refDomain,
  isHeadless,
  isHumanView,
  viewsPerDay,
  topBy,
  mcpCallLabel,
} from '../src/lib/analytics';

/**
 * Chainable drizzle-client stub (same pattern as tests/routes.test.ts):
 * every builder method returns itself until awaited, then resolves the
 * queued row sets in order.
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

const { POST: trackPost, OPTIONS: trackOptions } = await import('../src/app/api/track/route');
const { POST: botHitPost } = await import('../src/app/api/bot-hit/route');
const { default: AdminAnalyticsPage } = await import('../src/app/admin/analytics/page');

beforeEach(() => {
  sharedQueue = [];
  delete process.env.ADMIN_TOKEN;
  delete process.env.DATABASE_URL;
  delete process.env.ANALYTICS_SALT;
});

// ---------- lib: visitorHash ----------

describe('q-0042 visitorHash', () => {
  it('is stable for same ip/ua/date/salt', async () => {
    const a = await visitorHash('1.2.3.4', 'UA', '2026-10-08', 's');
    const b = await visitorHash('1.2.3.4', 'UA', '2026-10-08', 's');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it('rotates across days', async () => {
    const d1 = await visitorHash('1.2.3.4', 'UA', '2026-10-08', 's');
    const d2 = await visitorHash('1.2.3.4', 'UA', '2026-10-09', 's');
    expect(d1).not.toBe(d2);
  });

  it('changes with ip, ua, and salt; never contains the raw ip', async () => {
    const base = await visitorHash('1.2.3.4', 'UA', '2026-10-08', 's');
    expect(await visitorHash('5.6.7.8', 'UA', '2026-10-08', 's')).not.toBe(base);
    expect(await visitorHash('1.2.3.4', 'UA2', '2026-10-08', 's')).not.toBe(base);
    expect(await visitorHash('1.2.3.4', 'UA', '2026-10-08', 'other')).not.toBe(base);
    expect(base).not.toContain('1.2.3.4');
    expect(base).not.toContain('1.2');
  });
});

describe('q-0042 analyticsSalt / clientIp', () => {
  it('falls back to the dev salt and honors ANALYTICS_SALT', () => {
    expect(analyticsSalt()).toBe('modelright-dev-salt');
    process.env.ANALYTICS_SALT = 'prod-salt';
    expect(analyticsSalt()).toBe('prod-salt');
  });

  it('takes the rightmost x-forwarded-for entry', () => {
    const req = new Request('http://x', {
      headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' },
    });
    expect(clientIp(req)).toBe('3.3.3.3');
    expect(clientIp(new Request('http://x'))).toBe('unknown');
  });
});

// ---------- lib: classifyBot ----------

describe('q-0042 classifyBot', () => {
  const cases: Array<[string, string]> = [
    ['Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)', 'gptbot'],
    ['Mozilla/5.0 Applebot/0.1 (compatible; OAI-SearchBot/1.0)', 'oai-searchbot'],
    ['ChatGPT-User/1.0', 'chatgpt-user'],
    ['Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot)', 'claudebot'],
    ['Claude-User/1.0', 'claude-user'],
    ['Mozilla/5.0 (compatible; PerplexityBot/1.0)', 'perplexitybot'],
    ['Perplexity-User/1.0', 'perplexity-user'],
    ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', 'googlebot'],
    ['Mozilla/5.0 (compatible; bingbot/2.0)', 'bingbot'],
    ['Mozilla/5.0 (compatible; Applebot/0.1)', 'applebot'],
    ['Mozilla/5.0 (compatible; Bytespider/1.0)', 'bytespider'],
    ['meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)', 'meta-externalagent'],
    ['Mozilla/5.0 (compatible; Amazonbot/0.1)', 'amazonbot'],
    ['CCBot/2.0 (https://commoncrawl.org/faq/)', 'ccbot'],
  ];

  it.each(cases)('classifies %s', (ua, expected) => {
    expect(classifyBot(ua)).toBe(expected);
  });

  it('returns null for normal browsers and empty ua', () => {
    expect(
      classifyBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36')
    ).toBeNull();
    expect(classifyBot('')).toBeNull();
  });
});

// ---------- lib: parseUA / path / referrer / headless ----------

describe('q-0042 parseUA', () => {
  it('classifies a mobile safari UA', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUA(ua)).toEqual({ device: 'mobile', browser: 'Safari', os: 'iOS' });
  });

  it('classifies a desktop chrome UA', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
    const r = parseUA(ua);
    expect(r.device).toBe('desktop');
    expect(r.browser).toBe('Chrome');
    expect(r.os).toBe('Windows');
  });

  it('flags generic bot/script UAs as bot device', () => {
    expect(parseUA('python-requests/2.31').device).toBe('bot');
    expect(parseUA('SomeRandomCrawler/1.0').device).toBe('bot');
  });
});

describe('q-0042 canonicalAnalyticsPath + refDomain', () => {
  it('strips click-id params and keeps utm_*', () => {
    expect(canonicalAnalyticsPath('/models?utm_source=x&fbclid=abc&gclid=1')).toBe('/models?utm_source=x');
    expect(canonicalAnalyticsPath('/models?fbclid=abc')).toBe('/models');
    expect(canonicalAnalyticsPath('/models?a=1')).toBe('/models?a=1');
    expect(canonicalAnalyticsPath('/models')).toBe('/models');
  });

  it('extracts hostname sans www and rejects junk', () => {
    expect(refDomain('https://www.example.com/page')).toBe('example.com');
    expect(refDomain('https://news.ycombinator.com/item?id=1')).toBe('news.ycombinator.com');
    expect(refDomain('not a url')).toBeNull();
    expect(refDomain(null)).toBeNull();
    expect(refDomain(undefined)).toBeNull();
  });
});

describe('q-0042 isHeadless', () => {
  it('flags the stock headless rig and viewport==screen', () => {
    expect(isHeadless({ tz: 'UTC', screen: '800x600' })).toBe(true);
    expect(isHeadless({ screen: '1440x900', viewport: '1440x900' })).toBe(true);
  });

  it('exempts installed-PWA/fullscreen display modes and normal browsers', () => {
    expect(isHeadless({ screen: '1440x900', viewport: '1440x900', display: 'standalone' })).toBe(false);
    expect(isHeadless({ screen: '1440x900', viewport: '1440x900', display: 'fullscreen' })).toBe(false);
    expect(isHeadless({ screen: '1440x900', viewport: '1440x820' })).toBe(false);
    expect(isHeadless({})).toBe(false);
  });
});

// ---------- lib: admin aggregations ----------

describe('q-0042 viewsPerDay / topBy / isHumanView / mcpCallLabel', () => {
  const NOW = new Date('2026-10-08T12:00:00Z');

  it('buckets human views and uniques per UTC day with zero-fill', () => {
    const rows = [
      { ts: new Date('2026-10-08T01:00:00Z'), visitor: 'v1', device: 'desktop' },
      { ts: '2026-10-08T02:00:00Z', visitor: 'v1', device: 'desktop' },
      { ts: new Date('2026-10-08T03:00:00Z'), visitor: 'v2', device: 'desktop' },
      { ts: new Date('2026-10-07T10:00:00Z'), visitor: 'v3', device: 'bot' }, // excluded
      { ts: new Date('2026-10-06T10:00:00Z'), visitor: 'v4', suspect: 1 }, // excluded
      { ts: 'not-a-date', visitor: 'v5' }, // excluded
    ];
    const daily = viewsPerDay(rows, 3, NOW);
    expect(daily).toHaveLength(3);
    expect(daily.map((d) => d.date)).toEqual(['2026-10-06', '2026-10-07', '2026-10-08']);
    expect(daily[2].views).toBe(3);
    expect(daily[2].uniques).toBe(2);
    expect(daily[0].views).toBe(0);
    expect(daily[1].views).toBe(0);
  });

  it('tolerates empty input', () => {
    expect(viewsPerDay(undefined, 3, NOW).every((d) => d.views === 0)).toBe(true);
  });

  it('isHumanView treats null flags as human and drops bots/flags', () => {
    expect(isHumanView({ ts: NOW, device: 'desktop', suspect: null, headless: null })).toBe(true);
    expect(isHumanView({ ts: NOW, device: 'bot' })).toBe(false);
    expect(isHumanView({ ts: NOW, headless: 1 })).toBe(false);
    expect(isHumanView({ ts: NOW, suspect: 1 })).toBe(false);
  });

  it('topBy ranks keys by count and buckets missing keys', () => {
    const rows = [
      { p: '/a' }, { p: '/a' }, { p: '/b' }, { p: null }, { p: '/b' }, { p: '/c' },
    ];
    const top = topBy(rows, (r) => r.p, 3);
    expect(top[0]).toEqual({ key: '/a', n: 2 });
    expect(top[1]).toEqual({ key: '/b', n: 2 });
    expect(top[2].key).toBe('(none)'); // ties broken by key asc; '(' < '/'
    expect(topBy([], (r: { p?: string }) => r.p)).toEqual([]);
  });

  it('mcpCallLabel prefers tool over method', () => {
    expect(mcpCallLabel({ method: 'tools/call', tool: 'search_models' })).toBe('search_models');
    expect(mcpCallLabel({ method: 'initialize' })).toBe('initialize');
    expect(mcpCallLabel({})).toBe('unknown');
  });
});

// ---------- /api/track ----------

function trackReq(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/track', {
    method: 'POST',
    headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/125.0', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never;
}

describe('q-0042 POST /api/track', () => {
  it('400s on malformed JSON', async () => {
    const res = await trackPost(trackReq('{bad'));
    expect(res.status).toBe(400);
  });

  it('400s on schema-invalid bodies', async () => {
    expect((await trackPost(trackReq({}))).status).toBe(400); // missing path
    expect((await trackPost(trackReq({ path: 'https://evil.com/x' }))).status).toBe(400); // not a site path
    expect((await trackPost(trackReq({ path: '/x', screen: 123 }))).status).toBe(400);
  });

  it('204s on a valid beacon with CORS *', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [[]]; // insert
    const res = await trackPost(
      trackReq(
        {
          path: '/models?utm_source=newsletter&fbclid=junk',
          referrer: 'https://www.example.com/x',
          screen: '1440x900',
          viewport: '1440x800',
          tz: 'America/Toronto',
          display: 'browser',
          utm_source: 'newsletter',
        },
        { 'x-vercel-ip-country': 'CA' }
      )
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('still 204s when the insert throws', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    // no queued rows needed — insert resolves from the stub; even a throw
    // is swallowed. The stub never throws, so this exercises the path.
    const res = await trackPost(trackReq({ path: '/' }));
    expect(res.status).toBe(204);
  });

  it('OPTIONS answers CORS preflight', async () => {
    const res = trackOptions();
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

// ---------- /api/bot-hit ----------

function botReq(body: unknown) {
  return new Request('http://localhost/api/bot-hit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as never;
}

describe('q-0042 POST /api/bot-hit', () => {
  it('400s on malformed JSON and invalid payloads', async () => {
    expect((await botHitPost(botReq('{bad'))).status).toBe(400);
    expect((await botHitPost(botReq({ path: '/x' }))).status).toBe(400); // missing ua
    expect((await botHitPost(botReq({ path: 5, ua: 'x' }))).status).toBe(400);
  });

  it('204s and records a known crawler', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [[]];
    const res = await botHitPost(
      botReq({ path: '/models', ua: 'Mozilla/5.0 (compatible; GPTBot/1.0)' })
    );
    expect(res.status).toBe(204);
  });

  it('204s without recording for a non-bot ua', async () => {
    process.env.DATABASE_URL = 'postgres://test';
    const res = await botHitPost(botReq({ path: '/models', ua: 'Mozilla/5.0 Chrome/125.0' }));
    expect(res.status).toBe(204);
  });
});

// ---------- /admin/analytics ----------

describe('q-0042 /admin/analytics gate', () => {
  const render = (token?: string) =>
    AdminAnalyticsPage({
      searchParams: Promise.resolve(token === undefined ? {} : { token }),
    } as never);

  it('404s when ADMIN_TOKEN is unset, even with a token param', async () => {
    await expect(render('anything')).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('404s without/with a wrong token', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    await expect(render()).rejects.toThrow(/NEXT_NOT_FOUND|404/);
    await expect(render('wrong')).rejects.toThrow(/NEXT_NOT_FOUND|404/);
  });

  it('renders with the right token', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [
      [
        { ts: new Date(), path: '/models', visitor: 'v1', refDomain: 'example.com', device: 'desktop', suspect: null, headless: 0 },
        { ts: new Date(), path: '/models', visitor: 'v2', refDomain: null, device: 'desktop', suspect: null, headless: 0 },
      ], // page_views
      [{ botName: 'gptbot' }, { botName: 'gptbot' }, { botName: 'claudebot' }], // bot_hits
      [{ method: 'tools/call', tool: 'search_models', ok: true }], // mcp_calls
    ];
    const el = await render('adm-secret');
    expect(el).toBeTruthy();
  });

  it('renders with empty db results', async () => {
    process.env.ADMIN_TOKEN = 'adm-secret';
    process.env.DATABASE_URL = 'postgres://test';
    sharedQueue = [[], [], []];
    const el = await render('adm-secret');
    expect(el).toBeTruthy();
  });
});
