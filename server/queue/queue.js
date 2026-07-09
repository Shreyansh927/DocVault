
import { Queue } from "bullmq";
import rediss from "./redis.js";

export const fileProcessingQueue = new Queue("file-processing", {
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
