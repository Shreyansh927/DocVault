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

// Connect to Redis immediately on server startup
await redis.connect();
