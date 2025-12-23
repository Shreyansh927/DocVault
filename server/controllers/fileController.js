import { db } from "../db.js";
import { imagekit } from "../imagekit.js";
import { uploadFilesToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import officeParser from "officeparser";

/* ================= GEMINI SETUP ================= */
const genAI = new GoogleGenerativeAI("AIzaSyAoDnlu-O_GkB-GbICwIA4PGOVbc3azkLw");

/* ================= TEXT EXTRACTION ================= */

const extractTextFromFile = async (file) => {
  try {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    ) {
      const text = await officeParser.parseOfficeAsync(file.buffer);
      return text;
    }

    // DOCX
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await officeParser.parseOfficeAsync(file.buffer);
      return text;
    }

    if (file.mimetype === "text/plain") {
      return file.buffer.toString("utf-8");
    }

    return null;
  } catch (err) {
    console.warn("OFFICE PARSE FAILED:", err.message);
    return null;
  }
};

/* ================= AI SUMMARIZATION ================= */
const summarizeFileWithAI = async (file) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // -------- PDF (inlineData supported) --------
    if (file.mimetype.includes("pdf")) {
      // Safety limit
      if (file.size > 2 * 1024 * 1024) return null;

      const result = await model.generateContent([
        "Summarize this document in 3 short sentences.",
        {
          inlineData: {
            mimeType: "application/pdf",
            data: file.buffer.toString("base64"),
          },
        },
      ]);

      return result.response.text();
    }

    // -------- OTHER DOCS (text extraction) --------
    const extractedText = await extractTextFromFile(file);
    if (!extractedText || extractedText.length < 50) return null;

    const result = await model.generateContent(
      `Summarize the following content in 3 short sentences:\n\n${extractedText}`
    );

    return result.response.text();
  } catch (err) {
    console.error("AI SUMMARY FAILED:", err.message);
    return null; // DO NOT BLOCK UPLOAD
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

    /* ---------- Validate Folder ---------- */
    const folderRes = await db.query(
      "SELECT id FROM folders WHERE id=$1 AND user_id=$2",
      [folderId, userId]
    );
    if (!folderRes.rows.length) {
      return res.status(403).json({ error: "Unauthorized folder access" });
    }

    const uploadedFiles = [];

    for (const file of files) {
      const { publicUrl } = await uploadFilesToSupabase(userId, folderId, file);

      const aiSummary = await summarizeFileWithAI(file);

      const dbRes = await db.query(
        `
        INSERT INTO files
        (folder_id, filename, encrypted_name, encrypted_link, file_type, size, storage, ai_summary)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
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
        ]
      );

      uploadedFiles.push(dbRes.rows[0]);
    }

    res.json({ message: "Files uploaded successfully", files: uploadedFiles });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
};

/* ================= DOWNLOAD FILE ================= */
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      `
      SELECT f.encrypted_link
      FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE f.id = $1 AND fo.user_id = $2
      `,
      [fileId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "File not found" });
    }

    return res.redirect(result.rows[0].encrypted_link);
  } catch (err) {
    console.error("DOWNLOAD ERROR:", err);
    res.status(500).json({ error: "Cannot download file" });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.body;
    const email = req.user.email;

    if (!email || !folderId || !fileId) {
      return res.status(404).json({ error: "missing credentials" });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = userRes.rows[0].id;

    const result = await db.query(
      `UPDATE files SET is_deleted= true, deleted_at = NOW(), permanent_expiry= NOW() + INTERVAL '2 minutes' WHERE id =$1 AND folder_id = $2 AND folder_id IN (
      SELECT id FROM folders WHERE user_id=$3
      ) RETURNING id`,
      [fileId, folderId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "file not found" });
    }

    return res.status(200).json({ message: "file deleted successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Delete failed" });
  }
};

export const deleteAllFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const email = req.user.email;

    if (!email || !folderId) {
      return res.status(404).json({ error: "missing credentials" });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = userRes.rows[0].id;
    const folderRes = await db.query(
      `SELECT * FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folderRes.rows.length) {
      return res.status(404).json({ error: "folder not found" });
    }

    const result = await db.query(
      `UPDATE files SET is_deleted=true , deleted_at= NOW(), permanent_expiry= NOW() + INTERVAL '2 minutes' WHERE folder_id=$1 AND folder_id IN (
    SELECT id FROM folders WHERE user_id=$2) RETURNING id`,
      [folderId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "no files found" });
    }

    return res
      .status(200)
      .json({ message: "all files moved trash successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: `${err}` });
  }
};

export const deleteExpiredFiles = async (req, res) => {
  try {
    await db.query(
      `DELETE FROM files WHERE is_deleted=true AND permanent_expiry<= NOW()`
    );
  } catch (err) {
    console.log(err);
    return res.status(400).json({ error: "error in permanent deletion" });
  }
};

export const restoreFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.body;
    const email = req.user.email;

    if (!email || !folderId || !fileId) {
      return res.status(404).json({ error: "missing credentials" });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = userRes.rows[0].id;

    const result = await db.query(
      `UPDATE files SET is_deleted=false, deleted_at=null, permanent_expiry=null WHERE id=$1 AND folder_id=$2 AND folder_id IN (SELECT id FROM folders WHERE user_id=$3)`,
      [fileId, folderId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "error in restoring file" });
    }

    return res.status(200).json({ message: "file restored successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "error in db" });
  }
};

export const restoreAllFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const email = req.user.email;

    if (!email || !folderId) {
      return res.status(404).json({ error: "missing credentials" });
    }

    const userRes = await db.query(`SELECT * FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = userRes.rows[0].id;

    const result = await db.query(
      `UPDATE files SET is_deleted= false, permanent_expiry=null, deleted_at=null WHERE folder_id=$1 AND folder_id IN (SELECT id FROM folders WHERE user_id=$2)`,
      [folderId, userId]
    );

    return res
      .status(200)
      .json({ message: "all trash files resetored successfully" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
};
