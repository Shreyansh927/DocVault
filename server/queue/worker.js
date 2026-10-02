import "dotenv/config";

import { Worker } from "bullmq";
import rediss from "./redis.js";

import { db } from "../db.js";
import supabase from "../supabase.js";

import { summarizeFileWithAI } from "../utils/ai.js";
import { generateEmbedding } from "../utils/embedding.js";
import { summarizeVideoWithGemini } from "../utils/videoSummary.js";

// ============================================================
// FILE PROCESSING WORKER
// ============================================================

const worker = new Worker(
  "file-processing",

  async (job) => {
    console.log(`\n========================================`);
    console.log(`Processing Job ${job.id}`);
    console.log(`========================================`);

    const { fileId, folderId, userId } = job.data;

    // ========================================================
    // 1. GET FILE FROM DATABASE
    // ========================================================

    const result = await db.query(
      `
      SELECT *
      FROM files
      WHERE id = $1
      `,
      [fileId],
    );

    if (!result.rows.length) {
      throw new Error(`File not found: ${fileId}`);
    }

    const file = result.rows[0];

    console.log("Processing:", file.filename);
    console.log("MIME:", file.file_type);

    // ========================================================
    // 2. DOWNLOAD FILE FROM SUPABASE
    // ========================================================

    const { data, error } = await supabase.storage
      .from("project2-bucket")
      .download(file.encrypted_link);

    if (error) {
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Downloaded from Supabase:", buffer.length, "bytes");

    // ========================================================
    // 3. VIDEO PIPELINE
    // ========================================================

    /* ========================================================
   3. VIDEO PIPELINE
======================================================== */

    if (file.file_type && file.file_type.startsWith("video/")) {
      console.log("\n🎥 VIDEO PIPELINE STARTED");

      /* ======================================================
     3.1 PROCESS VIDEO WITH GEMINI
     
     Transcript is saved INSIDE the callback immediately
     after transcript generation.
  ====================================================== */

      console.log("Sending video to Gemini...");

      const videoResult = await summarizeVideoWithGemini(
        buffer,
        file.filename,

        /* ================================================
         SAVE TRANSCRIPT IMMEDIATELY
      ================================================ */

        async ({ duration, transcript }) => {
          console.log("💾 Saving video transcript to PostgreSQL...");

          const transcriptText = transcript
            .map((segment) => {
              return `[${segment.start}s - ${segment.end}s] ${segment.text}`;
            })
            .join("\n");

          await db.query(
            `
          UPDATE files
          SET
            video_duration_seconds = $1,
            video_transcript = $2,
            tessract_extracted_text = $3
          WHERE id = $4
          `,
            [duration, JSON.stringify(transcript), transcriptText, fileId],
          );

          console.log("✅ Video transcript saved to PostgreSQL");
        },
      );

      /* ======================================================
     3.2 VALIDATE GEMINI RESPONSE
  ====================================================== */

      if (!videoResult) {
        throw new Error("Gemini returned no video processing result");
      }

      const duration = videoResult.duration || 0;

      const transcript = Array.isArray(videoResult.transcript)
        ? videoResult.transcript
        : [];

      const timeline = Array.isArray(videoResult.timeline)
        ? videoResult.timeline
        : [];

      const keyPoints = Array.isArray(videoResult.keyPoints)
        ? videoResult.keyPoints
        : [];

      const overview = videoResult.overview || "";

      console.log("Video duration:", duration);

      console.log("Transcript segments:", transcript.length);

      console.log("Timeline segments:", timeline.length);

      /* ======================================================
     3.3 CREATE SEARCHABLE TRANSCRIPT TEXT
  ====================================================== */

      const transcriptText = transcript
        .map((segment) => {
          return `[${segment.start}s - ${segment.end}s] ${segment.text}`;
        })
        .join("\n");

      console.log("Transcript characters:", transcriptText.length);

      /* ======================================================
     3.4 CREATE EMBEDDING SOURCE
  ====================================================== */

      const timelineText = timeline
        .map((segment) => {
          return `${segment.start}-${segment.end}s: ${segment.summary}`;
        })
        .join("\n");

      const embeddingSource = [
        overview,
        ...keyPoints,
        timelineText,
        transcriptText,
      ]
        .filter(Boolean)
        .join("\n");

      console.log("Embedding source characters:", embeddingSource.length);

      /* ======================================================
     3.5 GENERATE VIDEO EMBEDDING
  ====================================================== */

      let embeddingString = null;

      if (embeddingSource.trim()) {
        console.log("Generating video embedding...");

        const embedding = await generateEmbedding(embeddingSource);

        console.log("Video embedding length:", embedding?.length);

        if (embedding) {
          embeddingString = `[${embedding.join(",")}]`;

          console.log("✅ Video embedding generated");
        }
      } else {
        console.log("No embedding source available");
      }

      /* ======================================================
     3.6 DUPLICATE DETECTION
  ====================================================== */

      if (embeddingString) {
        console.log("Checking video duplicate...");

        const duplicateCheck = await db.query(
          `
        SELECT
          f.id,
          f.filename,
          1 - (
            f.new_embedding <=> $1::vector
          ) AS similarity
        FROM files f
        INNER JOIN folders fo
          ON f.folder_id = fo.id
        WHERE
          fo.user_id = $2
          AND f.deleted_at IS NULL
          AND f.new_embedding IS NOT NULL
          AND f.id != $3
        ORDER BY
          f.new_embedding <=> $1::vector
        LIMIT 1
        `,
          [embeddingString, userId, fileId],
        );

        const bestMatch = duplicateCheck.rows[0];

        if (bestMatch) {
          console.log("Best video match:", bestMatch.filename);

          console.log("Similarity:", bestMatch.similarity);
        }

        /* ====================================================
       3.7 DUPLICATE VIDEO FOUND
    ==================================================== */

        if (bestMatch && bestMatch.similarity >= 0.8) {
          console.log(`⚠️ Video duplicate detected: ${bestMatch.filename}`);

          await db.query(
            `
        UPDATE files
        SET
          ai_summary = $1,
          video_timeline = $2,
          new_embedding = $3,
          is_duplicate = true,
          duplicate_of = $4
        WHERE id = $5
        `,
            [
              overview,
              JSON.stringify(timeline),
              embeddingString,
              bestMatch.id,
              fileId,
            ],
          );

          console.log("✅ Duplicate video information saved");

          console.log("🎥 Video processing completed as duplicate");

          return;
        }
      }

      /* ======================================================
     3.8 SAVE FINAL VIDEO ANALYSIS
     
     IMPORTANT:
     Transcript has ALREADY been saved above.

     This update only saves the remaining AI analysis.
  ====================================================== */

      console.log("💾 Saving final video analysis...");

      await db.query(
        `
    UPDATE files
    SET
      ai_summary = $1,
      video_timeline = $2,
      new_embedding = $3
    WHERE id = $4
    `,
        [overview, JSON.stringify(timeline), embeddingString, fileId],
      );

      console.log("✅ Final video analysis saved");

      console.log("🎥 Video processing complete");

      return;
    }

    // ========================================================
    // 4. EXISTING DOCUMENT PIPELINE
    // ========================================================

    console.log("\n📄 Processing as normal document");

    const uploadedFile = {
      buffer,
      mimetype: file.file_type,
      size: file.size,
      originalname: file.filename,
    };

    // ========================================================
    // 4.1 AI SUMMARY
    // ========================================================

    const aiSummary = await summarizeFileWithAI(uploadedFile);

    console.log("AI Summary:", aiSummary);

    // ========================================================
    // 4.2 GENERATE EMBEDDING
    // ========================================================

    let embeddingString = null;

    if (!aiSummary) {
      console.log("No summary generated");
    } else {
      console.log("Generating embedding...");

      const embedding = await generateEmbedding(aiSummary);

      console.log("Embedding length:", embedding?.length);

      if (embedding) {
        embeddingString = `[${embedding.join(",")}]`;

        // ====================================================
        // 4.3 DUPLICATE CHECK
        // ====================================================

        console.log("Running duplicate check...");

        const duplicateCheck = await db.query(
          `
            SELECT
              f.id,
              f.filename,
              1 - (
                f.new_embedding <=> $1::vector
              ) AS similarity
            FROM files f
            INNER JOIN folders fo
              ON f.folder_id = fo.id
            WHERE
              fo.user_id = $2
              AND f.deleted_at IS NULL
              AND f.new_embedding IS NOT NULL
              AND f.id != $3
            ORDER BY
              f.new_embedding <=> $1::vector
            LIMIT 1
            `,
          [embeddingString, userId, fileId],
        );

        const bestMatch = duplicateCheck.rows[0];

        // ====================================================
        // 4.4 DUPLICATE DOCUMENT FOUND
        // ====================================================

        if (bestMatch && bestMatch.similarity >= 0.8) {
          console.log(`Duplicate detected: ${bestMatch.filename}`);

          await db.query(
            `
            UPDATE files
            SET
              ai_summary = $1,
              tessract_extracted_text = $2,
              new_embedding = $3,
              is_duplicate = true,
              duplicate_of = $4
            WHERE id = $5
            `,
            [aiSummary, null, embeddingString, bestMatch.id, fileId],
          );

          console.log("✅ Duplicate document saved");

          return;
        }
      }
    }

    // ========================================================
    // 4.5 SAVE NORMAL DOCUMENT RESULTS
    // ========================================================

    await db.query(
      `
      UPDATE files
      SET
        ai_summary = $1,
        tessract_extracted_text = $2,
        new_embedding = $3
      WHERE id = $4
      `,
      [aiSummary, null, embeddingString, fileId],
    );

    console.log("✅ AI Processing Complete");
  },

  // ==========================================================
  // WORKER OPTIONS
  // ==========================================================

  {
    connection: rediss,

    // Keep concurrency relatively low because video
    // processing is memory/CPU/API intensive.
    concurrency: 2,

    // Give long-running video jobs enough time to keep
    // their BullMQ lock.
    lockDuration: 5 * 60 * 1000,

    // Check stalled jobs every 30 seconds.
    stalledInterval: 30000,
  },
);

// ============================================================
// WORKER EVENTS
// ============================================================

worker.on("completed", (job) => {
  console.log(`\n✅ Completed Job ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`\n❌ Job ${job?.id} failed:`, err);
});

worker.on("error", (err) => {
  console.error("\n❌ Worker error:", err);
});

console.log("🚀 File Processing Worker Started");
