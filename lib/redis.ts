import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Vercel's Upstash-for-Redis integration names these KV_REST_API_URL/TOKEN,
// not the UPSTASH_REDIS_REST_* names this codebase otherwise uses -- prefer
// the Vercel-native names in production, fall back to the Upstash names for
// local dev (e.g. a self-hosted REST shim).
const REDIS_URL =
  (process.env.KV_REST_API_URL as string) ||
  (process.env.UPSTASH_REDIS_REST_URL as string);
const REDIS_TOKEN =
  (process.env.KV_REST_API_TOKEN as string) ||
  (process.env.UPSTASH_REDIS_REST_TOKEN as string);

export const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

export const lockerRedisClient = new Redis({
  url:
    (process.env.KV_REST_API_URL as string) ||
    (process.env.UPSTASH_REDIS_REST_LOCKER_URL as string),
  token:
    (process.env.KV_REST_API_TOKEN as string) ||
    (process.env.UPSTASH_REDIS_REST_LOCKER_TOKEN as string),
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  requests: number = 10,
  seconds:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  return new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(requests, seconds),
    analytics: true,
    prefix: "papermark",
  });
};
