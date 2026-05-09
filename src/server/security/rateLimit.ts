import { Redis } from "ioredis";
import { env } from "@/server/env";

const redis = new Redis(env.REDIS_URL);

export async function hitRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = `${key}:${Math.floor(now / windowSeconds)}`;
  const count = await redis.incr(bucket);
  if (count === 1) await redis.expire(bucket, windowSeconds);
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
