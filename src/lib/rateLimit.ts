interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  capacity?: number;
  refillRate?: number;
}

export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {}
): { allowed: boolean; retryAfterSeconds: number } {
  const capacity = options.capacity ?? 10;
  const refillRate = options.refillRate ?? 1;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: capacity, lastRefill: now };
    buckets.set(key, bucket);
  } else {
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsedSeconds * refillRate);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, retryAfterSeconds: 0 };
  } else {
    const needed = 1 - bucket.tokens;
    const retryAfterSeconds = Math.ceil(needed / refillRate);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
