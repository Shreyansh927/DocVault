import "dotenv/config";

import { Worker, UnrecoverableError } from "bullmq";
import { HumanMessage } from "@langchain/core/messages";

import rediss from "./redis.js";

import { graph } from "../ai/graphs/graph.js";
import { db } from "../db.js";
import ModelManager from "../ai/models/modelmanager.js";
// import { evaluateRAG } from "../rag-evaluation/evaluationClient.js";

// langsmith debug

console.log("Tracing:", process.env.LANGCHAIN_TRACING_V2);
console.log("Project:", process.env.LANGCHAIN_PROJECT);
console.log("API Key exists:", !!process.env.LANGCHAIN_API_KEY);

/* =========================================================
   ERROR HELPERS
========================================================= */

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

/* =========================================================
   AI WORKER
========================================================= */

const worker = new Worker(
  "ai-query-processing",

  async (job) => {
    try {
      console.log(`Processing AI Job ${job.id}`);

      const { jobId, userId, query } = job.data;

      /* =====================================================
         1. MARK JOB AS PROCESSING
      ===================================================== */

      await db.query(
        `
        UPDATE ai_query_jobs
        SET status = 'PROCESSING'
        WHERE id = $1
        `,
        [jobId],
      );

      /* =====================================================
         2. GENERATE QUERY EMBEDDING
         
         IMPORTANT:
         Generate this ONLY ONCE.
      ===================================================== */

      const embeddings = ModelManager.embeddings();

      console.log("Generating QUERY embedding...");

      const qembedding = await embeddings.embedQuery(query);

      console.log("QUERY embedding successful:", qembedding.length);

      const queryembeddingString = `[${qembedding.join(",")}]`;

      /* =====================================================
         3. SEMANTIC CACHE SEARCH
      ===================================================== */

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

          1 - (
            query_embedding <=> $1::vector
          ) AS similarity

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

      /* =====================================================
         4. HANDLE SEMANTIC CACHE RESULT SAFELY
      ===================================================== */

      if (cacheHit) {
        console.log(
          `Closest semantic match: ${cacheHit.similarity.toFixed(3)}`,
        );
      } else {
        console.log("No semantic cache candidate found");
      }

      //5. SEMANTIC CACHE HIT

      if (cacheHit && cacheHit.similarity >= 0.98) {
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

          WHERE id = $9
            AND user_id = $10
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

      console.log("Semantic cache MISS");

      // execute langraph

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

      /* =====================================================
         8. EXTRACT FINAL RESPONSE
      ===================================================== */

      const response =
        typeof result.finalResponse.res === "string"
          ? result.finalResponse.res
          : JSON.stringify(result.finalResponse.res);

      console.log("AI response generated successfully");

      console.log("Response type:", typeof response);

      const retrievedContexts = (result.finalResponse.retrievedDocuments ?? [])
        .map((doc) => doc.fileSummary)
        .filter(Boolean);

      console.log("===== RAG EVAL INPUT =====");
      console.log("Query:", query);
      console.log("Response:", response);
      console.log(
        "Retrieved Documents:",
        result.finalResponse.retrievedDocuments,
      );
      console.log("Retrieved Contexts:", retrievedContexts);
      console.log("Context Count:", retrievedContexts.length);

      // const evaluation = await evaluateRAG({
      //   userInput: query,
      //   response,
      //   retrievedContexts,
      //   reference: null,
      // });
      // console.log(evaluation);

      let respembeddingString = null;

      try {
        console.log("===== EMBEDDING DEBUG =====");

        console.log("query:", query);

        console.log("query type:", typeof query);

        console.log("response:", response);

        console.log("response type:", typeof response);

        console.log("Existing QUERY embedding:", qembedding.length);

        console.log("Generating RESPONSE embedding...");

        const rembedding = await embeddings.embedQuery(response);

        console.log("RESPONSE embedding successful:", rembedding.length);

        respembeddingString = `[${rembedding.join(",")}]`;
      } catch (err) {
        console.error("Embedding generation failed:", err);

        throw err;
      }

      /* =====================================================
         10. SAVE AI RESULT
      ===================================================== */

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

          cache_similarity = 0,
          tavily_retrieved_sources = $9::jsonb,

          evaluation_metrices = $10::jsonb

        WHERE id = $11
          AND user_id = $12
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
          JSON.stringify(result.finalResponse.context ?? []),
          JSON.stringify(result.evaluationResult ?? []),
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

      if (status === 429) {
        console.error("AI provider rate limit or quota exhausted.");

        console.error("This job will NOT be retried.");

        throw new UnrecoverableError(
          "AI provider rate limit or quota exhausted",
        );
      }

      if (status >= 500) {
        console.error("Transient server error.");

        console.error("BullMQ will retry with backoff.");

        throw err;
      }

      if (status >= 400 && status < 500) {
        console.error("Client/configuration error.");

        console.error("This request should NOT be repeatedly retried.");

        throw new UnrecoverableError(`Non-retryable HTTP error: ${status}`);
      }

      console.error("Unknown or network error.");

      console.error(
        "BullMQ will handle retry according to queue configuration.",
      );

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

// competed event...
worker.on("completed", (job) => {
  console.log(`AI Job ${job.id} Completed`);
});

// failed event...

worker.on("failed", async (job, err) => {
  console.error("AI Worker Job Failed:", err);

  if (job) {
    try {
      await db.query(
        `
          UPDATE ai_query_jobs

          SET status = 'FAILED'

          WHERE id = $1
          `,
        [job.data.jobId],
      );
    } catch (dbError) {
      console.error("Failed to update AI job status:", dbError);
    }
  }
});

// worker start
console.log("AI Worker Started");
