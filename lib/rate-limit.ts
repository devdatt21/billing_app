type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getClientIp(rawForwarded: string | null, rawRealIp: string | null): string {
  if (rawForwarded) {
    const first = rawForwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  if (rawRealIp?.trim()) return rawRealIp.trim();
  return 'unknown';
}

export function buildRateLimitKey(route: string, forwardedFor: string | null, realIp: string | null): string {
  return `${route}:${getClientIp(forwardedFor, realIp)}`;
}

export function enforceRateLimit(key: string, maxRequests: number, windowMs: number): {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
} {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
      remaining: maxRequests - 1,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    allowed: true,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    remaining: Math.max(0, maxRequests - existing.count),
  };
}
