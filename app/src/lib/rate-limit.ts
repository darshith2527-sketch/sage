import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Per-IP rate limits for Sage's AI routes, so nobody can drain the OpenAI credit.
//
// - With UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN set (free Upstash database),
//   limits are shared across every server instance. Use this in production.
// - Without them, a simple in-memory limiter is used. It still protects each server
//   instance, but instances don't share counts, so it's a fallback, not the real thing.

type Limit = { requests: number; windowSeconds: number };

// How much each route allows per IP address.
export const LIMITS = {
  rights: { requests: 20, windowSeconds: 600 }, // Know Your Rights chat
  intake: { requests: 40, windowSeconds: 600 }, // drafting chat
  draft: { requests: 15, windowSeconds: 600 }, // building a contract
  review: { requests: 5, windowSeconds: 600 }, // reviewing an agreement (larger model)
} satisfies Record<string, Limit>;

export type RouteName = keyof typeof LIMITS;

const hasUpstash = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const upstash = new Map<RouteName, Ratelimit>();

function upstashFor(route: RouteName): Ratelimit {
  let limiter = upstash.get(route);
  if (!limiter) {
    const { requests, windowSeconds } = LIMITS[route];
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      prefix: `sage:${route}`,
    });
    upstash.set(route, limiter);
  }
  return limiter;
}

// Fallback: timestamps of recent requests, per route and IP.
const memory = new Map<string, number[]>();

function memoryLimit(route: RouteName, ip: string): { success: boolean; reset: number } {
  const { requests, windowSeconds } = LIMITS[route];
  const now = Date.now();
  const key = `${route}:${ip}`;
  const recent = (memory.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  const success = recent.length < requests;
  if (success) recent.push(now);
  memory.set(key, recent);
  if (memory.size > 5000) memory.clear(); // keep memory bounded
  return { success, reset: (recent[0] ?? now) + windowSeconds * 1000 };
}

// The visitor's IP address, as reported by Vercel's proxy.
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Returns a 429 response if this IP is over the limit, or null if the request may go ahead.
export async function rateLimit(req: Request, route: RouteName): Promise<Response | null> {
  const ip = clientIp(req);
  let success: boolean;
  let reset: number;
  try {
    ({ success, reset } = hasUpstash ? await upstashFor(route).limit(ip) : memoryLimit(route, ip));
  } catch (error) {
    // If Upstash is down, fall back to memory rather than blocking everyone.
    console.error("Rate limiter error:", error);
    ({ success, reset } = memoryLimit(route, ip));
  }
  if (success) return null;
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return Response.json(
    { error: `Too many requests. Please wait about ${Math.ceil(retryAfter / 60)} minute(s) and try again.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
