import "dotenv/config";

import { Worker } from "bullmq";
import { HumanMessage } from "@langchain/core/messages";

import rediss from "./redis.js";

import { graph } from "../ai/graphs/graph.js";
import { db } from "../db.js";
import ModelManager from "../ai/models/modelmanager.js";

console.log("Tracing:", process.env.LANGCHAIN_TRACING_V2);
console.log("Project:", process.env.LANGCHAIN_PROJECT);
console.log("API Key exists:", !!process.env.LANGCHAIN_API_KEY);

const worker = new Worker(
  "ai-query-processing",

  async (job) => {
    console.log(`Processing AI Job ${job.id}`);

    const { jobId, userId, query } = job.data;

    // Update status
    await db.query(
      `
      UPDATE ai_query_jobs
      SET status='PROCESSING'
      WHERE id=$1
      `,
      [jobId],
    );

    const result = await graph.invoke(
      {
        userId,
        messages: [new HumanMessage(query)],
      },
      {
        configurable: {
          thread_id: `${userId}:${jobId}`,
        },
        runName: "DocVault AI Query",
        metadata: {
          jobId,
          userId,
          queue: "ai-query-processing",
          source: "bullmq-worker",
          app: "docvault",
        },
        tags: ["docvault", "rag", "bullmq"],
      },
    );

    const response =
      typeof result.finalResponse.res === "string"
        ? result.finalResponse.res
        : JSON.stringify(result.finalResponse.res);

    let queryembeddingString = null;
    let respembeddingString = null;

    try {
      console.log("===== EMBEDDING DEBUG =====");
      console.log("query:", query);
      console.log("query type:", typeof query);
      console.log("response:", response);
      console.log("response type:", typeof response);

      const embeddings = ModelManager.embeddings();

      console.log("Generating QUERY embedding...");

      const qembedding = await embeddings.embedQuery(query);

      console.log("QUERY embedding successful:", qembedding.length);

      console.log("Generating RESPONSE embedding...");

      const rembedding = await embeddings.embedQuery(response);

      console.log("RESPONSE embedding successful:", rembedding.length);

      queryembeddingString = `[${qembedding.join(",")}]`;
      respembeddingString = `[${rembedding.join(",")}]`;
    } catch (err) {
      console.error("Embedding generation failed:", err);
    }

    await db.query(
      `
      UPDATE ai_query_jobs

      SET

      response=$1,

      query_embedding=$2,

      response_embedding=$3,

      file_id=$4,

      folder_id=$5,

      status='COMPLETED',

      completed_at=NOW(),

      is_seen=false

      WHERE id=$6
      `,
      [
        response,
        queryembeddingString,
        respembeddingString,
        result.finalResponse.FileId,
        result.finalResponse.FolderId,
        jobId,
      ],
    );

    result.finalResponse.res = null;
    result.finalResponse.FileId = null;
    result.finalResponse.FolderId = null;

    console.log("AI Query Completed");
  },

  {
    connection: rediss,

    concurrency: 2,

    lockDuration: 600000,

    stalledInterval: 30000,
  },
);

worker.on("completed", (job) => {
  console.log(`AI Job ${job.id} Completed`);
});

worker.on("failed", async (job, err) => {
  console.error(err);

  if (job) {
    await db.query(
      `
      UPDATE ai_query_jobs

      SET

      status='FAILED'

      WHERE id=$1
      `,
      [job.data.jobId],
    );
  }
});

console.log("AI Worker Started");
