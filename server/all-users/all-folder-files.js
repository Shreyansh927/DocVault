import { db } from "../db.js";

/* ================= GET FILES ================= */
export const allFiles = async (req, res) => {
  try {
    const { folderId } = req.query;
    const userId = req.user.id;

    if (!folderId) {
      return res.status(400).json({ error: "folderId missing" });
    }

    // verify folder ownership
    const folder = await db.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folder.rows.length) {
      return res.status(403).json({ error: "Unauthorized folder access" });
    }

    const files = await db.query(
      `SELECT * FROM files 
       WHERE folder_id=$1 AND is_deleted=false 
       ORDER BY created_at DESC`,
      [folderId]
    );

    res.status(200).json({
      message: "Files fetched",
      allFiles: files.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching files" });
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
      `SELECT * FROM files 
       WHERE folder_id=$1 AND is_deleted=true 
       ORDER BY deleted_at DESC`,
      [folderId]
    );

    res.status(200).json({
      message: "Trash files fetched",
      allTrashFiles: trash.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching trash files" });
  }
};
