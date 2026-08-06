import "dotenv/config";
import IORedis from "ioredis";

const rediss = new IORedis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  maxRetriesPerRequest: null,
});

rediss.on("connect", () => {
  console.log("Connected to Redis");
});

rediss.on("ready", () => {
  console.log("Redis Ready");
});

rediss.on("error", (err) => {
  console.error("Redis Error:", err);
});

export default rediss;
