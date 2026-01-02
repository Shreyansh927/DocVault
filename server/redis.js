import { createClient } from "redis";

export const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("connect", () => {
  console.log("   Redis connected");
});

redis.on("error", (err) => {
  console.error("Redis error:", err);
});

// IMPORTANT: connect ONCE
await redis.connect();
