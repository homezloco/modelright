# Marketing

The marketing doctrine for this repository. `## Constitution` is
fleet-wide — copied verbatim into every repo's MARKETING.md; do not edit
it in place, change it at the canonical source and re-copy. `## Project
tuning` is this repo's own, filled in against the live product surface.

## Constitution

This section is the fleet marketing constitution — identical in every
repository's MARKETING.md. If it needs to change, change it at the
source and re-copy it everywhere; never fork it in place.

### Verify before drafting

Every claim cites the product's live surface — the README, positioning
docs, the deployed site, `llms.txt`/`agents.txt`, or the code itself —
pulled in the same session that drafts it. Never infer capabilities
from the repo name, a sibling project, a prior draft, or conversation
memory. Exact identifiers — tool names, REST paths, query params, plan
names, prices — are checked character-for-character against the code,
never approximated from what a feature sounds like it does. The most
expensive marketing bug is a category error: a confident, well-written
package about the wrong product. A name can lie; the live surface
can't.

### Three buckets

Every claim is *verified shipped*, *roadmap/unverified* (marked as such
or cut), or *held*. A package whose premise depends on an unverified
capability parks rather than ships plausible copy. Status recaps and
summary tables are product-facts surfaces — they carry the same
verification discipline as the drafts themselves. When memory and the
record disagree, the record wins.

### Never stage a demo

No staged output passed off as live, no templated run presented as a
real one, no speed-up without a visible timer, no screenshot of
something that wasn't actually run, no "live" claim for anything that
wasn't executed. If the flagship claim hasn't been run for real, the
launch waits. Public copy is a promise surface.

### One story spent once

The strongest asset — the flagship clip, the killer stat, the signature
case study — is spent once per launch beat, not dribbled across every
channel. Beats are separated deliberately in time so the story lands
with force where it's spent. Directory listings and profile pages are
cheap backlinks, not a launch.

### Honesty over polish

For a technical audience, gaps said aloud sell better than polish. When
asked about a missing capability, say so — the admission is credibility.
Say what the product is *not* as clearly as what it is. Check a
community's self-promotion rules before posting in it.

### The asset ladder — a sequence, not a pile

Assets form a ladder; each rung has one job and one asset class. An
asset that tries to carry three claims carries none.

| Rung | Job | Typical assets |
|---|---|---|
| Hook | Stop the scroll: one mechanism in seconds | a short clip, one striking image |
| Try | Turn attention into hands-on use | a no-signup demo, a free tier, a live tool |
| Believe | Prove it shipped real things | case studies, receipts, real usage |
| Trust | Prove it's safe to rely on | the security, permissions, and failure-mode story — in text |
| Pay | Close | a checkout that has actually charged a real buyer |

The hook is never the catalog: breadth is proven by the Try and Believe
rungs, not by stuffing every capability into one asset. Map each asset
to the rung it serves and the channel that rung belongs in.

### The funnel is measured, never narrated

landing → signup → activation → paid — watched through real analytics
only. Instrument what exists, report what the instrumentation captured,
and never invent numbers, per-channel splits, or properties the tracker
doesn't record. A funnel leak is a decision item, not a copy problem.

### Proof gates before launch posts

Proof first, blast after: a launch post waits on its gates being real —
the demo works for a fresh visitor, the claim was actually run, the
checkout actually charged. Channels are ordered by deadline pressure
and leverage, not glamour, and each gets the asset that fits its rung.

## Project tuning

Verified 2026-11-20 against the repo (README.md, GROWTH.md) and the
live site.

- **Positioning** — Modelright is the live registry of AI model specs,
  context windows, and per-1M-token pricing: the OpenRouter catalog
  syncs hourly, Artificial Analysis enriches models with benchmark and
  speed data, and every price change lands in an append-only snapshot
  log powering a changes feed and price-history charts. Surfaces:
  searchable catalog, side-by-side compare (+ SEO pair pages), task
  picks with explicit rules, a public REST API + OpenAPI, and a 6-tool
  MCP server with the full agent surface (llms.txt, agents.txt, A2A
  agent card, official MCP-registry listing). It is NOT a database
  schema linter or migration tool — the name lies. No billing exists
  anywhere in the repo: it is a free public registry, not a paid SaaS.
- **Audience** — developers and agent builders picking a model by
  price, spec, or benchmark — and their agents, who query the same
  registry over API/MCP.
- **Channel priority** —
  1. Agent-facing surfaces (highest leverage and already live: MCP
     Registry listing, Smithery server card, `/api/v1/*`, llms.txt).
  2. Comparison/alternatives pages (`/alternatives/artificial-analysis`
     is the open g-0003 item).
  3. Directory submit kits queued in GROWTH.md — tier-1 (Product Hunt,
     AlternativeTo, BetaList, SaaSHub) then niche (DevHunt, There's An
     AI For That, Futurepedia).
- **Current asset/proof-gate status** — live at https://modelright.dev
  (verified responding 2026-11-20). Shipped and verifiable: catalog,
  compare + pair pages, task picks, changes feed + RSS, public REST
  API, 6-tool MCP server, agent surfaces, hourly sync + append-only
  price history. Not verified: any directory listing as live —
  GROWTH.md's verify round is still open; and nothing is monetized
  (correctly — there's no checkout to point at).
