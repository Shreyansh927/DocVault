import { db } from "../db.js";
import { redis } from "../redis.js";
import { uploadFilesToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";
import { GoogleGenAI } from "@google/genai";
import officeParser from "officeparser";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in environment variables");
}

/* = GEMINI SETUP == */
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateEmbedding = async (text) => {
  try {
    const result = await genAI.models.embedContent({
      model: "gemini-embedding-001",
      contents: [
        {
          role: "user",
          parts: [{ text }],
        },
      ],
    });

    return result.embeddings[0].values.slice(0, 1536);
  } catch (err) {
    console.error("Gemini embedding failed:", err);
    return null;
  }
};

/* ================= TEXT EXTRACTION ================= */
const extractTextFromFile = async (file) => {
  try {
    if (
      file.mimetype.includes("presentation") ||
      file.mimetype.includes("wordprocessingml")
    ) {
      return await officeParser.parseOfficeAsync(file.buffer);
    }

    if (file.mimetype === "text/plain") {
      return file.buffer.toString("utf-8");
    }

    return null;
  } catch (err) {
    console.warn("Office parse failed:", err.message);
    return null;
  }
};

/*  AI SUMMARIZATION*/
export const summarizeFileWithAI = async (file) => {
  try {
    if (!file) return null;

    /* ---------- PDF ---------- */
    if (file.mimetype === "application/pdf") {
      if (file.size > 10 * 1024 * 1024) return null;

      const base64PDF = file.buffer.toString("base64");

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: "Summarize this document in 3 concise sentences." },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64PDF,
                },
              },
            ],
          },
        ],
      });

      return result.text;
    }

    /* ---------- IMAGE ---------- */
    if (file.mimetype.startsWith("image/")) {
      if (file.size > 5 * 1024 * 1024) return null;

      const base64Image = file.buffer.toString("base64");

      const result = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: "Describe and summarize this image in 10 words." },
              {
                inlineData: {
                  mimeType: file.mimetype,
                  data: base64Image,
                },
              },
            ],
          },
        ],
      });

      return result.text;
    }

    /* ---------- DOC / TXT ---------- */
    const extractedText = await extractTextFromFile(file);
    if (!extractedText || extractedText.length < 100) return null;

    const safeText = extractedText.slice(0, 12_000);

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following content in detail:\n\n${safeText}`,
    });

    return result.text;
  } catch (err) {
    console.error("AI summary failed:", err.message);
    return null;
  }
};

/* ================= UPLOAD FILES ================= */
export const uploadFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const files = req.files;
    const userId = req.user.id;

    if (!folderId || !files?.length) {
      return res.status(400).json({ error: "Missing data" });
    }

    // validate folder ownership
    const folderRes = await db.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId],
    );

    if (!folderRes.rows.length) {
      return res.status(403).json({ error: "Unauthorized folder access" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const { publicUrl } = await uploadFilesToSupabase(userId, folderId, file);

      const aiSummary = await summarizeFileWithAI(file);

      let embeddingString = null;

      if (aiSummary) {
        const embedding = await generateEmbedding(aiSummary);

        if (embedding && Array.isArray(embedding)) {
          embeddingString = `[${embedding.join(",")}]`;
          console.log("Generated embedding");
        } else {
          console.warn("Embedding generation failed");
        }
      }

      await redis?.del(`folderFiles:${userId}:${folderId}`);
      const dbRes = await db.query(
        `
        INSERT INTO files
        (folder_id, filename, encrypted_name, encrypted_link, file_type, size, storage, ai_summary, embedding)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
        `,
        [
          folderId,
          file.originalname,
          `${Date.now()}_${file.originalname}`,
          publicUrl,
          file.mimetype,
          file.size,
          "supabase",
          aiSummary,
          embeddingString,
        ],
      );

      uploadedFiles.push(dbRes.rows[0]);
    }

    return res.status(201).json({
      message: "Files uploaded successfully",
      files: uploadedFiles,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `
      SELECT f.encrypted_link
      FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE f.id=$1 AND fo.user_id=$2 AND f.is_deleted=false
      `,
      [fileId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.json({ url: result.rows[0].encrypted_link });
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err.message);
    return res.status(500).json({ error: "Cannot download file" });
  }
};

/* ================= SOFT DELETE SINGLE FILE ================= */
export const deleteFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.body;
    const userId = req.user.id;

    await redis?.del(`folderFiles:${userId}:${folderId}`);

    const result = await db.query(
      `
      UPDATE files
      SET is_deleted=true,
          deleted_at=NOW(),
          permanent_expiry=NOW() + INTERVAL '2 minutes'
      WHERE id=$1
        AND folder_id=$2
        AND folder_id IN (
          SELECT id FROM folders WHERE user_id=$3
        )
      RETURNING id
      `,
      [fileId, folderId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.status(200).json({ message: "File moved to trash" });
  } catch (err) {
    console.error("DELETE FILE ERROR:", err.message);
    return res.status(500).json({ error: "Delete failed" });
  }
};

/* ================= SOFT DELETE ALL FILES ================= */
export const deleteAllFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const userId = req.user.id;

    await redis?.del(`folderFiles:${userId}:${folderId}`);

    const result = await db.query(
      `
      UPDATE files
      SET is_deleted=true,
          deleted_at=NOW(),
          permanent_expiry=NOW() + INTERVAL '2 minutes'
      WHERE folder_id=$1
        AND folder_id IN (
          SELECT id FROM folders WHERE user_id=$2
        )
      RETURNING id
      `,
      [folderId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "No files found" });
    }

    return res.status(200).json({
      message: "All files moved to trash",
    });
  } catch (err) {
    console.error("DELETE ALL FILES ERROR:", err.message);
    return res.status(500).json({ error: "Delete failed" });
  }
};

/* ================= RESTORE SINGLE FILE ================= */
export const restoreFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.body;
    const userId = req.user.id;

    await redis?.del(`folderFiles:${userId}:${folderId}`);

    const result = await db.query(
      `
      UPDATE files
      SET is_deleted=false,
          deleted_at=NULL,
          permanent_expiry=NULL
      WHERE id=$1
        AND folder_id=$2
        AND folder_id IN (
          SELECT id FROM folders WHERE user_id=$3
        )
      RETURNING id
      `,
      [fileId, folderId, userId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Restore failed" });
    }

    return res.status(200).json({ message: "File restored successfully" });
  } catch (err) {
    console.error("RESTORE FILE ERROR:", err.message);
    return res.status(500).json({ error: "Restore failed" });
  }
};

/* ================= RESTORE ALL FILES ================= */
export const restoreAllFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const userId = req.user.id;

    await redis?.del(`folderFiles:${userId}:${folderId}`);

    await db.query(
      `
      UPDATE files
      SET is_deleted=false,
          deleted_at=NULL,
          permanent_expiry=NULL
      WHERE folder_id=$1
        AND folder_id IN (
          SELECT id FROM folders WHERE user_id=$2
        )
      `,
      [folderId, userId],
    );

    return res.status(200).json({
      message: "All files restored successfully",
    });
  } catch (err) {
    console.error("RESTORE ALL ERROR:", err.message);
    return res.status(500).json({ error: "Restore failed" });
  }
};

/* ================= CRON SAFE PERMANENT DELETE ================= */
export const deleteExpiredFilesService = async () => {
  try {
    await db.query(
      `DELETE FROM files WHERE is_deleted=true AND permanent_expiry <= NOW()`,
    );
  } catch (err) {
    console.error("CRON DELETE ERROR:", err.message);
  }
};

export const fileHealthCheck = async () => {
  try {
    const { rows } = await db.query(
      `SELECT files.ai_summary, folders.user_id, files.filename, folders.folder_name FROM files JOIN folders ON folders.id = files.folder_id`,
    );
    let context = "";
    for (let row of rows) {
      const chunk = `File ID: ${row.user_id}
Filename: ${row.filename}
Folder: ${row.folder_name}
AI Summary: ${row.ai_summary}
      `;

      context += chunk;
    }

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
You are an AI assistant.

Notify me whenever any of my file validity expires in upcomming 14 days. Here is the context of recently deleted files:
${context} provide me the filename which is going to expire soonest and its expiry date. If no files are expiring in next 14 days, just reply with "No files expiring soon"

`,
            },
          ],
        },
      ],
    });

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      await db.query(
        `
          INSERT INTO notifications 
          (user_id, sender_id, sender_name, sender_profile_image, type, status, message)
          VALUES ($1, NULL, 'System', '', 'FILE_DELETION', 'UNREAD', $2)
          `,
        [
          rows[0]?.user_id,
          `File "${result.candidates?.[0]?.content?.parts?.[0]?.text}" was permanently deleted.`,
        ],
      );
    } else {
      await db.query(
        `
          INSERT INTO notifications 
          (user_id, sender_id, sender_name, sender_profile_image, type, status, message)
          VALUES ($1, NULL, 'System', '', 'FILE_DELETION', 'UNREAD', $2)
          `,
        [rows[0]?.user_id, `No files are expiring in next 14 days.`],
      );
    }

    const answer = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    console.log("Health check AI answer:", answer);
    return true;
  } catch (err) {
    console.error("FILE HEALTH CHECK ERROR:", err.message);
    return "no worry";
  }
};
