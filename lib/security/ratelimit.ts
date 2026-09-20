import { Ratelimit } from "@upstash/ratelimit";

import { redis } from "@/lib/redis";

const limiter = (prefix: string, requests: number, window: `${number} ${"s" | "m" | "h"}`) =>
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `rl:${prefix}`,
    analytics: false,
  });

export const rateLimiters = {
  // login attempts per IP
  auth: limiter("auth", 10, "20 m"),
  // CSV link imports per team
  bulkLinkImport: limiter("bulk-link-import", 5, "1 h"),
  // custom-domain verification polls per user+team
  domainVerification: limiter("domain-verification", 20, "1 m"),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string,
): Promise<{ success: boolean; remaining?: number; error?: string }> {
  try {
    const result = await limiter.limit(identifier);
    return { success: result.success, remaining: result.remaining };
  } catch (error) {
    console.error("Rate limiting error:", error);
    // Fail open: a Redis hiccup must not lock people out.
    return { success: true, error: "Rate limiting unavailable" };
  }
}
