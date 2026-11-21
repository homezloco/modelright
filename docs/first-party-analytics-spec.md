# First-party funnel + attribution analytics

Reference implementation: **homezloco/browsercasa** — `src/site-analytics.mjs`
(primitives + both storage impls), `src/postgres-storage.mjs` (migrations),
`src/accounts.mjs` (the `acquisition` create field), `src/server.mjs` (view
recording on the public-GET gate + funnel event call sites),
`test/site-analytics.test.mjs`. ~250 lines of implementation, dependency-free
`.mjs` — portable to this repo in an afternoon, in this repo's own conventions
and storage layer.

**Design contract:** server-side only — no client beacon, script, or pixel.
Privacy-preserving by construction: nothing stored can identify a person, and
everything is bounded so caller bugs can't pollute the rollups.

## Storage (Postgres, migration-gated)

```sql
-- one row per public-page view
site_page_views (id, at, path, visitor, type, referer_host,
                 utm_source, utm_campaign)

-- one row per funnel transition — timestamps only, NO account ids
site_funnel_events (id, at, event, source)
```

Retention: 90 days, pruned on the infrequent admin read (no timers). The
file-mode in-memory impl mirrors the same port with a row cap — keep this
repo's equivalent fallback path working with secrets unset.

## The privacy primitives

- `visitor` = `sha256(salt:ip:ua:yyyy-mm-dd)` truncated — answers "same visitor
  today," decays tomorrow, never reversible to an IP.
- `referer_host` = hostname only, stripped at record time (paths/queries can
  carry share-link tokens).
- `type` = `human | crawler | agent | unknown` — positional classification
  (known-crawler UAs first, automation clients, then the Mozilla banner,
  residue last). Crawlers/agents are a first-class traffic class — this is why
  no client script exists.
- **Bounded vocabularies everywhere:** public paths are a `Set` (app doors
  excluded, `llms.txt` included — an AI agent reading it is a product visit);
  funnel events are a `Set` (unknown name → reject, never record); UTM values
  normalize to `[a-z0-9._-]{1,64}` lowercase or drop to null.

## The funnel edge cases worth copying

- **Signup carries no UTM params** — `attributeSource(visitor)` recovers the
  acquisition edge by joining the caller's same-day visitor hash to their most
  recent tagged public view. Later untagged views never erase the tag.
- **Downstream stages lose request context** — the payment webhook, checkout
  POST, and credential mints fire days later on authenticated doors. Solution:
  `acquisition {source, campaign}` is written set-once on the account row at
  signup (like `region`), and every `recordEvent` reads it back. This is the
  piece that makes per-channel conversion possible, not just per-channel
  signups.
- **Injection seams** — the analytics port is injectable, so the attribution
  call is `attributeSource?.(...) ?? null` wrapped non-fatally; a stub missing
  the method can't 500 signup.

## Wiring points (record exactly once, on success only)

| Door | Event | Source of `source` |
|---|---|---|
| `POST /signup` after create + directory register | `signup` | visitor-hash join |
| `POST /billing/checkout` after session validates | `checkout` | `account.acquisition.source` |
| payment webhook on checkout completed / sub→active | `activated` | `account.acquisition.source` |
| every credential-mint site (owner + operator doors) | `credential` | `account.acquisition.source` |

All fire-and-forget — `void recordEvent(...).catch(() => {})`. Analytics never
delays or breaks a door. Signup's `attributeSource` is the one awaited read
(needs the value before create), still wrapped so failure → null. Adapt the
event names/doors to this repo's actual funnel — the pattern is what matters,
not the literal stage list.

## The rollup (traffic() → operator digest)

```json
{
  "windows": { "h24": "…", "d7": "…", "d30": "…" },
  "byDay": "…", "byType": "…", "topPaths": "…", "topReferers": "…",
  "topSources": "views by utm_source, top 12",
  "funnel": { "signup|checkout|activated|credential": "{h24, d7, d30}" },
  "funnelBySource": "per-stage counts per channel, top 20, d30"
}
```

One response answers: who came, from which channel, who converted per stage —
with zero client-side tracking.

## The link-tagging counterpart (already live fleet-wide)

The analytics only work if outbound links are tagged. As of 2026-11-24 this is
done on the LiveGraph side: every Marketing Cadence drafter tags product URLs
with `utm_campaign=<its-cadence-graph-slug>` and the Hootsuite Scheduler sets
`utm_source=<platform>` (linkedin/twitter/facebook/instagram) at publish time.
Social clicks strip `Referer`, so untagged posts read as untracked direct —
with this instrumentation live, tagged rows start appearing immediately.
