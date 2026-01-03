import { db } from "../db.js";
import { redis } from "../redis.js";

/* ================= GET FILES ================= */
export const allFiles = async (req, res) => {
  try {
    const { folderId } = req.query;
    const userId = req.user.id;

    if (!folderId) {
      return res.status(400).json({ error: "folderId missing" });
    }

    const cacheKey = `folderFiles:${userId}:${folderId}`;

    /* ---------- CACHE READ ---------- */
    if (redis) {
      try {
        const cachedFiles = await redis.get(cacheKey);
        if (cachedFiles) {
          return res.status(200).json({
            allFiles: JSON.parse(cachedFiles),
            message: "FROM CACHE",
          });
        }
      } catch {
        console.warn("Redis read failed, falling back to DB");
      }
    }

    /* ---------- OWNERSHIP CHECK ---------- */
    const folder = await db.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folder.rows.length) {
      return res.status(403).json({ error: "Unauthorized folder access" });
    }

    /* ---------- DB READ ---------- */
    const files = await db.query(
      `
      SELECT
        id,
        filename,
        encrypted_link,
        file_type,
        size,
        ai_summary,
        created_at
      FROM files
      WHERE folder_id=$1 AND is_deleted=false
      ORDER BY created_at DESC
      `,
      [folderId]
    );

    /* ---------- CACHE WRITE ---------- */
    if (redis) {
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(files.rows));
      } catch {
        console.warn("Redis write failed");
      }
    }

    return res.status(200).json({
      message: "Files fetched",
      allFiles: files.rows,
    });
  } catch (err) {
    console.error("ALL FILES ERROR:", err);
    return res.status(500).json({ error: "Error fetching files" });
  }
};

/* ================= TRASH FILES ================= */
export const trashFiles = async (req, res) => {
  try {
    const { folderId } = req.query;
    const userId = req.user.id;

    if (!folderId) {
      return res.status(400).json({ error: "folderId missing" });
    }

    const folder = await db.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folder.rows.length) {
      return res.status(403).json({ error: "Unauthorized folder access" });
    }

    const trash = await db.query(
      `
      SELECT
        id,
        filename,
        file_type,
        size,
        deleted_at,
        ai_summary
      FROM files
      WHERE folder_id=$1 AND is_deleted=true
      ORDER BY deleted_at DESC
      `,
      [folderId]
    );

    return res.status(200).json({
      message: "Trash files fetched",
      allTrashFiles: trash.rows,
    });
  } catch (err) {
    console.error("TRASH FILES ERROR:", err);
    return res.status(500).json({ error: "Error fetching trash files" });
  }
};
