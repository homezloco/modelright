# Growth Queue

<!-- The growth loop works the first open item top to bottom, WIP 1 — one
     round per item; the item is ticked when its PR merges. Add lines
     anywhere; order is priority. Same marks as QUEUE.md: - [ ] open,
     - [x] done, - [!] needs human, - [-] dropped, (manual) never
     auto-picked. Items live in the g-NNNN namespace and ship on
     growth/g-NNNN-* branches.

     Product: modelright.dev is a live registry of AI model specs, context
     windows, and $/1M-token pricing across providers — for developers
     choosing a model, and for agents (everything readable as JSON and
     llms.txt). Real data only; freshness is visible. -->

## Open
- [ ] g-0001 Growth assets kit — create `growth/assets/` with logo variants (SVG + PNG), 2–3 screenshots (the /models index table, a /compare side-by-side, a model detail page), boilerplate at 50/100/200 chars ("live registry of AI model specs, context windows, and per-1M-token pricing"), category picks per directory tier (Developer Tools / AI / Analytics), and a founder-bio placeholder — acceptance: `growth/assets/` committed; every g-NNNN submission item below can be prepared without writing new copy — branch growth/g-0001-growth-assets-kit
- [ ] g-0002 Technical SEO/GEO baseline — audit existing surfaces: `src/app/llms.txt` (reachable at site root), `src/app/sitemap.ts` (covers /, /models, /compare, model detail pages), `src/app/robots.ts`; add Organization + WebSite JSON-LD on the landing (Dataset JSON-LD on /models is a bonus for answer engines); verify canonical + OG tags on /, /models, /compare — acceptance: every file/tag above verified or fixed in the diff — branch growth/g-0002-seo-geo-baseline
- [ ] g-0003 First content surface: /alternatives/artificial-analysis — a "Modelright vs Artificial Analysis" page positioning the open, OpenRouter-sourced live registry against the incumbent AI-model comparison site; honest claims only (real coverage = what providers we actually sync) — acceptance: page routes, carries Article/FAQ JSON-LD, and is linked from the site nav/footer — branch growth/g-0003-alternatives-artificial-analysis
- [ ] g-0004 Submit kit: Product Hunt (tier 1) — write `growth/ledger/<YYYY-MM-DD>-product-hunt.md` with prefilled name, tagline ≤60 chars, description, topics, first-comment draft — all sourced from `growth/assets/` — acceptance: ledger file complete, then item flips `[!]` NEEDS HUMAN: schedule the launch at producthunt.com — branch growth/g-0004-submit-product-hunt
- [ ] g-0005 Submit kit: AlternativeTo (tier 1) — write `growth/ledger/<YYYY-MM-DD>-alternativeto.md`: app entry prefilled (name, modelright.dev URL, 100-char blurb, platform web, category "AI tools / developer tools"), alternatives-to list seeded with Artificial Analysis — acceptance: ledger file complete, then `[!]` NEEDS HUMAN for the human click — branch growth/g-0005-submit-alternativeto
- [ ] g-0006 Submit kit: BetaList (tier 1) — write `growth/ledger/<YYYY-MM-DD>-betalist.md`: startup profile prefilled (pitch 50-char, description, market/category picks) — acceptance: ledger file complete, then `[!]` NEEDS HUMAN to submit — branch growth/g-0006-submit-betalist
- [ ] g-0007 Submit kit: SaaSHub (tier 1) — write `growth/ledger/<YYYY-MM-DD>-saashub.md`: listing prefilled (name, URL, 50/200-char descriptions, feature bullets, category "AI / analytics") — acceptance: ledger file complete, then `[!]` NEEDS HUMAN to submit — branch growth/g-0007-submit-saashub
- [ ] g-0008 Submit kit: DevHunt (niche) — write `growth/ledger/<YYYY-MM-DD>-devhunt.md`: dev-tool entry prefilled (name, tagline, description, category "API / data") — developer-tools launch directory, matches the developer audience — acceptance: ledger file complete, then `[!]` NEEDS HUMAN to submit — branch growth/g-0008-submit-devhunt
- [ ] g-0009 Submit kit: There's An AI For That (niche) — write `growth/ledger/<YYYY-MM-DD>-theresanaiforthat.md`: tool card prefilled (name, one-liner, 200-char description, task/category picks: AI research, pricing) — acceptance: ledger file complete, then `[!]` NEEDS HUMAN to submit — branch growth/g-0009-submit-theresanaiforthat
- [ ] g-0010 Submit kit: Futurepedia (niche) — write `growth/ledger/<YYYY-MM-DD>-futurepedia.md`: tool entry prefilled from `growth/assets/` (description, category "AI resources", pricing model = free) — acceptance: ledger file complete, then `[!]` NEEDS HUMAN to submit — branch growth/g-0010-submit-futurepedia
- [ ] g-0011 Verify + ledger round — re-check each `growth/ledger/*.md` entry for live status (listing_verify only — if it answers not_configured or host_not_allowed, mark the item [!] NEEDS HUMAN naming the host; never fetch the page another way), backfill a `live: <url>` line only for confirmed-live listings — acceptance: every ledger file carries a verified status line; unconfirmed entries keep `status: pending` — branch growth/g-0011-verify-ledger

## Done
