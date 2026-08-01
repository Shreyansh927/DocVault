import { Queue } from "bullmq";
import rediss from "./redis.js";

export const aiQueryQueue = new Queue("ai-query-processing", {
  connection: rediss,

  defaultJobOptions: {
    removeOnComplete: 100,

    removeOnFail: 50,

    attempts: 3,

    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});
