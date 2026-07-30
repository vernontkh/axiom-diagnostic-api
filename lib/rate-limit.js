/**
 * A sliding-window limiter held in the function instance's memory.
 *
 * Be clear about what this is and is not. Serverless instances are ephemeral
 * and run in parallel, so a caller who lands on a cold instance starts with a
 * fresh allowance. This raises the cost of casual abuse; it does not stop a
 * determined one.
 *
 * It is here because every request spends real money at the model provider, and
 * an unauthenticated public endpoint with no ceiling is an open tab. For a
 * shared, authoritative ceiling, move the counter to Vercel KV or Upstash Redis
 * — the interface below stays the same.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const MAX_TRACKED_CLIENTS = 5_000;

const hits = new Map();

function sweep(now) {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

export function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/** Returns { allowed, retryAfterSeconds }. */
export function checkRateLimit(key) {
  const now = Date.now();

  // Bound memory before it can grow without limit.
  if (hits.size > MAX_TRACKED_CLIENTS) sweep(now);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const oldest = Math.min(...recent);
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterSeconds: 0 };
}
