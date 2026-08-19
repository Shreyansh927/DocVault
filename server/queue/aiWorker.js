import "dotenv/config";

import { Worker, UnrecoverableError } from "bullmq";
import { HumanMessage } from "@langchain/core/messages";

import rediss from "./redis.js";

import { graph } from "../ai/graphs/graph.js";
import { db } from "../db.js";
import ModelManager from "../ai/models/modelmanager.js";

console.log("Tracing:", process.env.LANGCHAIN_TRACING_V2);
console.log("Project:", process.env.LANGCHAIN_PROJECT);
console.log("API Key exists:", !!process.env.LANGCHAIN_API_KEY);

function getErrorStatus(err) {
  return (
    err?.statusCode ??
    err?.status ??
    err?.response?.status ??
    err?.cause?.statusCode ??
    err?.cause?.status ??
    null
  );
}

function classifyError(err) {
  const status = getErrorStatus(err);

  if (status === 429) {
    return "RATE_LIMIT";
  }

  if (status >= 500) {
    return "SERVER_ERROR";
  }

  if (status >= 400 && status < 500) {
    return "CLIENT_ERROR";
  }

  return "UNKNOWN_ERROR";
}

const worker = new Worker(
  "ai-query-processing",

  async (job) => {
    try {
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

      const embeddings = ModelManager.embeddings();

      const qembedding = await embeddings.embedQuery(query);

      const queryembeddingString = `[${qembedding.join(",")}]`;

      const cacheCheck = await db.query(
        `
  SELECT
    id,
    response,
    file_id,
    folder_id,
    timing,
    retrieved_documents,
    reranked_documents,
    1 - (query_embedding <=> $1::vector) AS similarity
  FROM ai_query_jobs
  WHERE user_id = $2
    AND status = 'COMPLETED'
    AND query_embedding IS NOT NULL
    AND response IS NOT NULL
    AND id != $3
  ORDER BY query_embedding <=> $1::vector
  LIMIT 1
  `,
        [queryembeddingString, userId, jobId],
      );

      const cacheHit = cacheCheck.rows[0];
      console.log(`Semantic cache MISS (${cacheHit.similarity.toFixed(3)})`);

      if (cacheHit && cacheHit.similarity >= 0.9) {
        console.log(`Semantic cache HIT (${cacheHit.similarity.toFixed(3)})`);

        await db.query(
          `
    UPDATE ai_query_jobs
    SET
      response = $1,
      query_embedding = $2,
      file_id = $3,
      folder_id = $4,
      status = 'COMPLETED',
      completed_at = NOW(),
      is_seen = false,
      timing = $5::jsonb,
      retrieved_documents = $6::jsonb,
      reranked_documents = $7::jsonb,
      cache_hit = true,
      cache_similarity = $8
    WHERE id = $9 AND user_id = $10
    `,
          [
            cacheHit.response,
            queryembeddingString,
            cacheHit.file_id,
            cacheHit.folder_id,
            JSON.stringify(cacheHit.timing ?? {}),
            JSON.stringify(cacheHit.retrieved_documents ?? []),
            JSON.stringify(cacheHit.reranked_documents ?? []),
            cacheHit.similarity,
            jobId,
            userId,
          ],
        );

        console.log("Returned from semantic cache");

        return;
      }

      console.log("Semantic cache MISS!!!");

      const result = await graph.invoke(
        { userId, messages: [new HumanMessage(query)] },
        {
          configurable: { thread_id: `${userId}:${jobId}` },
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

      // const finalAIMessage = result.messages
      //   .filter((m) => m.type === "ai")
      //   .at(-1);

      // const usage = finalAIMessage?.usage_metadata || {};

      // const promptTokens = usage.input_tokens || 0;
      // const completionTokens = usage.output_tokens || 0;
      // const totalTokens = usage.total_tokens || 0;

      // console.log({
      //   promptTokens,
      //   completionTokens,
      //   totalTokens,
      // });

      // Get the final AI message from LangGraph
      // const finalMessage = result.messages[result.messages.length - 1];
      // console.log("Final message metadata:", finalMessage.response_metadata);
      // console.log("Final usage metadata:", finalMessage.usage_metadata);

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
        throw err;
      }

      await db.query(
        `
  UPDATE ai_query_jobs
  SET
    response = $1,
    query_embedding = $2,
    response_embedding = $3,
    file_id = $4,
    folder_id = $5,
    status = 'COMPLETED',
    completed_at = NOW(),
    is_seen = false,
    timing = $6::jsonb,
    retrieved_documents = $7::jsonb,
    reranked_documents = $8::jsonb,
    cache_hit = false,
    cache_similarity = 0
  WHERE id = $9 AND user_id = $10
  `,
        [
          response,
          queryembeddingString,
          respembeddingString,
          result.finalResponse.FileId,
          result.finalResponse.FolderId,
          JSON.stringify(result.finalResponse.Timing ?? {}),
          JSON.stringify(result.finalResponse.retrievedDocuments ?? []),
          JSON.stringify(result.finalResponse.rerankedDocuments ?? []),
          jobId,
          userId,
        ],
      );

      result.finalResponse.res = null;
      result.finalResponse.FileId = null;
      result.finalResponse.FolderId = null;

      console.log("AI Query Completed");
    } catch (err) {
      const status = getErrorStatus(err);
      const type = classifyError(err);

      console.error("===== AI JOB ERROR =====");
      console.error("Status:", status);
      console.error("Type:", type);
      console.error("Message:", err?.message);

      if (
        status === 400 ||
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 404 ||
        status === 429
      ) {
        console.log("no backoff!!!!");
        throw new UnrecoverableError(`Non-retryable HTTP error: ${status}`);
      }

      if (status === 429) {
        console.error(
          "Cohere/API rate limit detected. BullMQ should retry with long backoff.",
        );
      } else if (status >= 500) {
        console.error(
          "Transient server error. BullMQ should retry with normal backoff.",
        );
      } else if (status >= 400 && status < 500) {
        console.error(
          "Client/configuration error. This should NOT be repeatedly retried.",
        );
      }

      throw err;
    }
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
