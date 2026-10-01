# Plan

## Now

modelright.dev — "find the right model, and keep it right." Two jobs:
selection (compare models by workload: context, price, modality) and
freshness (is it actually serving — availability + price drift, fed by
LiveGraph hop telemetry and scheduled provider-catalog pulls).

## Direction

- Next.js 14 app router, TypeScript strict, Drizzle + Postgres on Railway.
- Data plane: POST /api/ingest (tokened) written to by a LiveGraph ingest
  graph — the app never scrapes providers itself.
- Pages are boring and fast: server components, no client state lib.
- Every merged PR must keep `npm run build` green and /health returning
  {"ok":true}.
