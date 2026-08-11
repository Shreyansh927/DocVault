import "dotenv/config";

import { Worker } from "bullmq";
import rediss from "./redis.js";

import { db } from "../db.js";
import supabase from "../supabase.js";

import { summarizeFileWithAI } from "../utils/ai.js";
import { generateEmbedding } from "../utils/embedding.js";
import { tessractTextExtraction } from "../utils/ocr.js";

const worker = new Worker(
  "file-processing",

  async (job) => {
    console.log(`Processing Job ${job.id}`);

    const { fileId, folderId, userId } = job.data;

    /*
      Get file from database
    */

    const result = await db.query(
      `
      SELECT *
      FROM files
      WHERE id=$1
      `,
      [fileId],
    );

    if (!result.rows.length) {
      throw new Error("File not found");
    }

    const file = result.rows[0];

    /*
      Download from Supabase
    */

    const { data, error } = await supabase.storage
      .from("project2-bucket")
      .download(file.encrypted_link);

    if (error) {
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    /*
      Create multer-like object
    */

    const uploadedFile = {
      buffer,

      mimetype: file.file_type,

      size: file.size,

      originalname: file.filename,
    };

    console.log("Downloaded from storage");

    /*
      OCR
    */

    // let extractedText = null;

    // if (file.file_type.startsWith("image/")) {
    //   extractedText = await tessractTextExtraction(uploadedFile);
    // }

    // console.log(extractedText);

    /*
      Summary
    */

    // Summary
    const aiSummary = await summarizeFileWithAI(uploadedFile);

    console.log("AI Summary:", aiSummary);

    let embeddingString = null;

    if (!aiSummary) {
      console.log(
        "No summary generated, skipping embedding and duplicate check",
      );
    } else {
      console.log("Generating embedding...");

      const embedding = await generateEmbedding(aiSummary);

      console.log("Embedding length:", embedding?.length);

      if (embedding) {
        embeddingString = `[${embedding.join(",")}]`;

        console.log("Running duplicate check...");

        const duplicateCheck = await db.query(
          `
      SELECT
        f.id,
        f.filename,
        1 - (f.new_embedding <=> $1::vector) AS similarity
      FROM files f
      INNER JOIN folders fo
        ON f.folder_id = fo.id
      WHERE fo.user_id = $2
        AND f.deleted_at IS NULL
        AND f.new_embedding IS NOT NULL
        AND f.id != $3
      ORDER BY f.new_embedding <=> $1::vector
      LIMIT 1
      `,
          [embeddingString, userId, fileId],
        );

        console.log("Duplicate rows:", duplicateCheck.rows);

        const bestMatch = duplicateCheck.rows[0];

        if (bestMatch) {
          console.log(
            "Best match:",
            bestMatch.filename,
            "Similarity:",
            bestMatch.similarity,
          );
        }

        if (bestMatch && bestMatch.similarity >= 0.8) {
          console.log(
            `Duplicate detected: ${bestMatch.filename} (${bestMatch.similarity})`,
          );

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

          return;
        }
      }
    }

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

    console.log("AI Processing Complete");
  },

  {
    connection: rediss,

    concurrency: 2,
    lockDuration: 10000, // 2 minutes
    stalledInterval: 10000, // Check for stalled jobs every minute
  },
);

worker.on("completed", (job) => {
  console.log(`Completed ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(err);
});

console.log("Worker Started");
