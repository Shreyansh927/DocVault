import "dotenv/config";
import IORedis from "ioredis";

console.log("REDIS_URL =", process.env.REDIS_URL);

const rediss = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  tls: {},
});

rediss.on("connect", () => {
  console.log("✅ Connected to Upstash");
});

rediss.on("ready", () => {
  console.log("✅ Redis Ready");
});

rediss.on("error", (err) => {
  console.log(process.env.REDIS_URL);
  console.error("Redis Error:", err);
});

export default rediss;
