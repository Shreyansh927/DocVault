import { createClient } from "redis";
import { Redis } from "ioredis";

export const redisPublisher = new Redis(process.env.REDIS_URL);

export const redisSubscriber = new Redis(process.env.REDIS_URL);

redisPublisher.on("connect", () => {
  console.log("Redis publisher connected");
});

redisSubscriber.on("connect", () => {
  console.log("Redis subscriber connected");
});

redisPublisher.on("error", (err) => {
  console.log("Redis publisher error:", err);
});

redisSubscriber.on("error", (err) => {
  console.log("Redis subscriber error:", err);
});
