// Cookieless analytics (q-0042). Visitors are identified by a
// daily-rotating sha256(ip + ua + date + salt) hash — no cookies, no
// persistent identity, and the raw IP is never stored.
//
// This module is deliberately free of node-only imports (no node:crypto,
// no db): src/middleware.ts runs in the edge runtime and imports
// classifyBot from here, so everything must stay edge-safe.

/** Salt for the daily visitor hash. Read at request time so tests and
 *  deploys can rotate it without a rebuild. */
export function analyticsSalt(): string {
  return process.env.ANALYTICS_SALT ?? 'modelright-dev-salt';
}

/** sha256 hex (first 16 chars) of ip|ua|date|salt via Web Crypto — works
 *  in both the node route runtime and the edge runtime. */
export async function visitorHash(
  ip: string,
  ua: string,
  date: string,
  salt: string
): Promise<string> {
  const data = new TextEncoder().encode(`${ip}|${ua}|${date}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex.slice(0, 16);
}

/** Client IP from x-forwarded-for. The hosting edge appends the real
 *  client IP last, so the rightmost entry is the trusted one — the
 *  leftmost is attacker-controlled. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'unknown';
  const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? 'unknown';
}

// ---------- bot classification ----------

// Ordered so specific names win over prefixes (e.g. claude-user before a
// hypothetical plain "claude" rule). Names are the canonical lowercase
// labels used for grouping in the admin panel.
const BOT_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/oai-searchbot/i, 'oai-searchbot'],
  [/chatgpt-user/i, 'chatgpt-user'],
  [/gptbot/i, 'gptbot'],
  [/claude-searchbot/i, 'claude-searchbot'],
  [/claude-user/i, 'claude-user'],
  [/claudebot/i, 'claudebot'],
  [/perplexity-user/i, 'perplexity-user'],
  [/perplexitybot/i, 'perplexitybot'],
  [/google-inspectiontool/i, 'google-inspectiontool'],
  [/google-extended/i, 'google-extended'],
  [/googlebot/i, 'googlebot'],
  [/bingbot/i, 'bingbot'],
  [/applebot/i, 'applebot'],
  [/bytespider/i, 'bytespider'],
  [/meta-externalagent|meta-externalfetcher/i, 'meta-externalagent'],
  [/amazonbot/i, 'amazonbot'],
  [/ccbot/i, 'ccbot'],
];

/** Known search/AI-crawler UA → canonical bot name, or null for humans. */
export function classifyBot(ua: string): string | null {
  if (!ua) return null;
  for (const [re, name] of BOT_PATTERNS) {
    if (re.test(ua)) return name;
  }
  return null;
}

// ---------- UA heuristics ----------

const GENERIC_BOT_UA =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|httpclient|headless|lighthouse|pingdom|uptime/i;

export function deviceType(ua: string): string {
  if (GENERIC_BOT_UA.test(ua)) return 'bot';
  if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini/i.test(ua))
    return 'mobile';
  if (/android/i.test(ua)) return 'tablet';
  return 'desktop';
}

export function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios|chromium/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  if (GENERIC_BOT_UA.test(ua)) return 'bot';
  if (/curl|wget|python|httpclient/i.test(ua)) return 'script';
  return 'other';
}

export function parseOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/mac os x|macintosh/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/cros/i.test(ua)) return 'ChromeOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'other';
}

/** Coarse { device, browser, os } classification from a UA string. */
export function parseUA(ua: string): { device: string; browser: string; os: string } {
  return { device: deviceType(ua), browser: parseBrowser(ua), os: parseOS(ua) };
}

// ---------- path / referrer helpers ----------

// Per-click noise params: every shared link carries a unique value, so
// each click lands as its own path and floods the top-pages table.
// utm_* is NOT stripped — it's the campaign-attribution channel.
const CLICK_ID_PARAMS = [
  'fbclid', 'gclid', 'msclkid', 'twclid', 'dclid', 'igshid',
  'mc_cid', 'mc_eid', 'mibextid', 'wantsurl', 'trk',
];

/** Canonical form for analytics grouping: drop click-ID params, keep
 *  everything else. Non-URL strings are returned unchanged. */
export function canonicalAnalyticsPath(path: string): string {
  const q = path.indexOf('?');
  if (q < 0) return path;
  const pathname = path.slice(0, q);
  const params = new URLSearchParams(path.slice(q + 1));
  let changed = false;
  for (const p of CLICK_ID_PARAMS) {
    if (params.has(p)) {
      params.delete(p);
      changed = true;
    }
  }
  if (!changed) return path;
  const rest = params.toString();
  return rest ? `${pathname}?${rest}` : pathname;
}

/** Hostname (sans www.) of a referrer URL, or null when not parseable. */
export function refDomain(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host || null;
  } catch {
    return null;
  }
}

// ---------- client-rig fingerprints ----------

export const DISPLAY_MODES = new Set(['browser', 'standalone', 'fullscreen', 'minimal-ui']);

export interface PageViewBeacon {
  tz?: string;
  screen?: string;
  viewport?: string;
  display?: string;
}

/** Headless-rig fingerprint: the stock puppeteer/playwright rig (UTC tz +
 *  800x600 screen), or viewport == screen — in a real browser tab chrome
 *  and scrollbars always eat viewport pixels, so an exact match means no
 *  browser UI. Except when there legitimately is none: installed PWA or
 *  F11/kiosk fullscreen, which the beacon reports via `display`. */
export function isHeadless(input: PageViewBeacon): boolean {
  if (input.tz === 'UTC' && input.screen === '800x600') return true;
  const noBrowserUi = input.display === 'standalone' || input.display === 'fullscreen';
  return input.screen != null && input.screen === input.viewport && !noBrowserUi;
}

// ---------- admin aggregations (pure — page does the DB reads) ----------

export interface PageViewRow {
  ts: Date | string;
  path?: string | null;
  visitor?: string | null;
  refDomain?: string | null;
  device?: string | null;
  suspect?: number | null;
  headless?: number | null;
}

export interface BotHitRow {
  botName?: string | null;
}

export interface McpCallRow {
  method?: string | null;
  tool?: string | null;
  ok?: boolean | null;
}

/** "Human" = not a UA-classified bot and not flagged suspect/headless —
 *  NULL flags count as human (unevaluated rows). */
export function isHumanView(row: PageViewRow): boolean {
  return row.device !== 'bot' && (row.suspect ?? 0) === 0 && (row.headless ?? 0) === 0;
}

export interface DayTraffic {
  /** UTC day key, YYYY-MM-DD. */
  date: string;
  views: number;
  uniques: number;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Human views + distinct visitors per UTC day for the trailing `days`-day
 *  window ending `now`. Zero-fills empty days, oldest first. */
export function viewsPerDay(
  rows: PageViewRow[] | null | undefined,
  days = 30,
  now: Date = new Date()
): DayTraffic[] {
  const window: DayTraffic[] = [];
  const indexByDate = new Map<string, number>();
  const uniqueSets: Array<Set<string>> = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const date = dayKey(day);
    indexByDate.set(date, window.length);
    window.push({ date, views: 0, uniques: 0 });
    uniqueSets.push(new Set());
  }
  for (const row of rows ?? []) {
    if (!isHumanView(row)) continue;
    const ts = row.ts instanceof Date ? row.ts : new Date(row.ts);
    if (Number.isNaN(ts.getTime())) continue;
    const idx = indexByDate.get(dayKey(ts));
    if (idx === undefined) continue;
    window[idx].views += 1;
    if (row.visitor) uniqueSets[idx].add(row.visitor);
  }
  window.forEach((d, i) => {
    d.uniques = uniqueSets[i].size;
  });
  return window;
}

/** Generic "top N" counter over a row collection. Null/empty keys are
 *  bucketed under `(none)`; rows are ordered by count desc then key asc. */
export function topBy<T>(
  rows: T[] | null | undefined,
  key: (row: T) => string | null | undefined,
  limit = 15
): Array<{ key: string; n: number }> {
  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const k = key(row) || '(none)';
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([k, n]) => ({ key: k, n }))
    .sort((a, b) => b.n - a.n || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** Display label for an mcp_calls row: the tool name for tools/call,
 *  otherwise the JSON-RPC method. */
export function mcpCallLabel(row: McpCallRow): string {
  return row.tool || row.method || 'unknown';
}
