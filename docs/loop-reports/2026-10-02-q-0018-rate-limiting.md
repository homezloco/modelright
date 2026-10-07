# Loop Report: q-0018 Rate limiting on /api/ingest

**Item ID:** q-0018  
**Acceptance Criteria:** Token-bucket per INGEST_TOKEN (configurable capacity/refill), returns 429 with Retry-After header when exceeded. 11 rapid requests with same token yields one 429 and Retry-After header present.

## What Changed
- Created `src/lib/rateLimit.ts` implementing an in-memory token-bucket rate limiter per token, with configurable capacity (default 10) and refill rate (default 1 token/sec).
- Integrated `checkRateLimit` into `POST /api/ingest` (`src/app/api/ingest/route.ts`), returning HTTP status 429 with a `Retry-After` header when rate limit capacity is exceeded.
- Ticked `q-0018` in `QUEUE.md` and appended the branch reference.

## What Couldn't Be Verified
- Live runtime HTTP requests (verified via code inspection and CI test pipeline).

## What Remains
- None.
