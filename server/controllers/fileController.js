import { db } from "../db.js";
import { redis } from "../redis.js";
import supabase from "../supabase.js";
import { uploadFilesToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";
import { fileProcessingQueue } from "../queue/queue.js";

import { GoogleGenAI } from "@google/genai";
import officeParser from "officeparser";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport/index.js";
import { check } from "zod";

/* ================= UPLOAD FILES ================= */
export const uploadFiles = async (req, res) => {
  try {
    const { folderId } = req.body;
    const files = req.files;
    const userId = req.user.id;

    if (!folderId || !files?.length) {
      return res.status(400).json({
        error: "Missing data",
      });
    }

    // Get user
    const user = await db.query(`SELECT auth_uuid FROM users WHERE id = $1`, [
      userId,
    ]);

    const auth_uuid = user.rows[0]?.auth_uuid;

    // Validate folder ownership
    const folder = await db.query(
      `
      SELECT id
      FROM folders
      WHERE id = $1
      AND user_id = $2
      `,
      [folderId, userId],
    );

    if (!folder.rows.length) {
      return res.status(403).json({
        error: "Unauthorized folder access",
      });
    }

    const uploadedFiles = [];
    const duplicateFiles = [];

    for (const file of files) {
      // ----------------------------------------------------
      // 1. Fast filename duplicate check
      // ----------------------------------------------------
      const checkDuplicate = await db.query(
        `
        SELECT 1
        FROM files f
        JOIN folders fo ON f.folder_id = fo.id
        WHERE f.folder_id = $1
          AND fo.user_id = $2
          AND LOWER(f.filename) = LOWER($3)
          AND f.is_deleted = FALSE
        LIMIT 1
        `,
        [folderId, userId, file.originalname],
      );

      if (checkDuplicate.rows.length > 0) {
        duplicateFiles.push(file.originalname);

        return res.status(409).json({
          success: false,
          message: `File "${file.originalname}" already exists in this folder.`,
        });
      }

      // ----------------------------------------------------
      // 2. Upload to Supabase
      // ----------------------------------------------------
      const { storagePath } = await uploadFilesToSupabase(
        userId,
        folderId,
        file,
      );

      // ----------------------------------------------------
      // 3. Insert into database
      // ----------------------------------------------------
      const dbRes = await db.query(
        `
        INSERT INTO files
        (
          folder_id,
          filename,
          encrypted_name,
          encrypted_link,
          file_type,
          size,
          storage,
          ai_summary,
          tessract_extracted_text,
          new_embedding,
          is_duplicate,
          duplicate_of
        )
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,NULL,NULL,NULL,FALSE,NULL)
        RETURNING *
        `,
        [
          folderId,
          file.originalname,
          `${Date.now()}_${file.originalname}`,
          storagePath,
          file.mimetype,
          file.size,
          "supabase",
        ],
      );

      const savedFile = dbRes.rows[0];

      // ----------------------------------------------------
      // 4. Add background AI processing job
      // ----------------------------------------------------
      await fileProcessingQueue.add("process-file", {
        fileId: savedFile.id,
        folderId: savedFile.folder_id,
        userId,
      });

      uploadedFiles.push(savedFile);
    }

    // ----------------------------------------------------
    // 5. Send a single notification
    // ----------------------------------------------------
    if (uploadedFiles.length > 0) {
      const allUploadedFileNames = uploadedFiles
        .map((f) => f.filename)
        .join(", ");

      await db.query(
        `
        INSERT INTO notifications
        (
          user_id,
          sender_id,
          type,
          text_notification,
          file_route,
          sender_name,
          sender_profile_image,
          status,
          created_at
        )
        VALUES
        ($1, NULL, 'FILE_UPLOAD', $2, $3, NULL, NULL, 'UNREAD', NOW())
        `,
        [
          auth_uuid,
          `Files ${allUploadedFileNames} uploaded successfully.`,
          `/files/${folderId}`,
        ],
      );
    }

    return res.status(201).json({
      success: true,
      message: "Files uploaded successfully. AI processing started.",
      uploadedCount: uploadedFiles.length,
      duplicateCount: duplicateFiles.length,
      duplicatesSkipped: duplicateFiles,
      files: uploadedFiles,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);

    return res.status(500).json({
      error: "Upload failed",
    });
  }
};

// export const downloadFile = async (req, res) => {
//   try {
//     const { fileId } = req.params;
//     const userId = req.user.id;

//     const result = await db.query(
//       `
//       SELECT f.encrypted_link
//       FROM files f
//       JOIN folders fo ON f.folder_id = fo.id
//       WHERE f.id=$1 AND fo.user_id=$2 AND f.is_deleted=false
//       `,
//       [fileId, userId],
//     );

//     if (!result.rows.length) {
//       return res.status(404).json({ error: "File not found" });
//     }

//     return res.json({ url: result.rows[0].encrypted_link });
//   } catch (err) {
//     console.error("DOWNLOAD ERROR:", err.message);
//     return res.status(500).json({ error: "Cannot download file" });
//   }
// };

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

export const accessFile = async (req, res) => {
  try {
    const fileId = Number(req.params.fileId);

    const userId = Number(req.user.id);

    const { rows } = await db.query(
      `
        SELECT
            f.encrypted_link,
            f.file_type,
            fo.user_id AS owner_id
        FROM files f
        JOIN folders fo
            ON fo.id = f.folder_id
        WHERE
            f.id = $1
            AND f.is_deleted = FALSE
        `,
      [fileId],
    );

    if (!rows.length) {
      return res.status(404).json({
        error: "File not found",
      });
    }

    const file = rows[0];

    let hasAccess = false;

    /*
       OWNER
    */

    if (file.owner_id === userId) {
      hasAccess = true;
    } else {
      /*
       FRIEND
    */
      const permission = await db.query(
        `
          SELECT 1
          FROM friends
          WHERE
              user_id = $1
              AND friend_id = $2
              AND show_folders = TRUE
          `,
        [file.owner_id, userId],
      );

      hasAccess = permission.rows.length > 0;
    }

    if (!hasAccess) {
      return res.status(403).json({
        error: "You don't have access to this file",
      });
    }

    const { data, error } = await supabase.storage
      .from("project2-bucket")
      .download(file.encrypted_link);

    if (error) {
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();

    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", file.file_type);

    return res.send(buffer);
  } catch (err) {
    console.error("ACCESS FILE ERROR:", err.message);

    return res.status(500).json({
      error: "Cannot access file",
    });
  }
};
