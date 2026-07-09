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

    const { fileId } = job.data;

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

    let extractedText = null;

    if (file.file_type.startsWith("image/")) {
      extractedText = await tessractTextExtraction(uploadedFile);
    }

    /*
      Summary
    */

    const aiSummary = await summarizeFileWithAI(uploadedFile);

    /*
      Embedding
    */

    let embeddingString = null;

    if (aiSummary) {
      const embedding = await generateEmbedding(aiSummary);

      if (embedding) {
        embeddingString = `[${embedding.join(",")}]`;
      }
    }

    /*
      Update database
    */

    await db.query(
      `
      UPDATE files

      SET

      ai_summary=$1,

      tessract_extracted_text=$2,

      new_embedding=$3

      WHERE id=$4

      `,

      [aiSummary, extractedText, embeddingString, fileId],
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
