import { db } from "../db.js";
import { redis } from "../redis.js";

/* ---------------- ADD FOLDER ---------------- */
export const addFolder = async (req, res) => {
  try {
    const { folderName, category } = req.body;
    const userEmail = req.user?.email;

    if (!folderName || !userEmail) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // get user id
    const userResult = await db.query(`SELECT id FROM users WHERE email=$1`, [
      userEmail,
    ]);

    if (!userResult.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // check if folder already exists
    const exists = await db.query(
      `SELECT 1 FROM folders WHERE folder_name=$1 AND user_id=$2`,
      [folderName.trim(), userId]
    );

    if (exists.rows.length) {
      return res.status(409).json({ error: "Folder already exists" });
    }

    // await redis?.del(`userFolders:${userId}`);

    await db.query(
      `INSERT INTO folders (folder_name, user_id, category)
       VALUES ($1, $2, $3)`,
      [folderName.trim(), userId, category]
    );

    return res.status(201).json({
      message: "Folder created successfully",
    });
  } catch (err) {
    console.error("Add folder error:", err.message);
    return res.status(500).json({ error: "Error creating folder" });
  }
};

/* ---------------- DELETE FOLDER ---------------- */
export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.body;
    const email = req.user?.email;

    if (!email || !folderId) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // get user
    const userResult = await db.query(`SELECT id FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userResult.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // check folder ownership
    const folderResult = await db.query(
      `SELECT id FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folderResult.rows.length) {
      return res.status(404).json({ error: "Folder not found" });
    }

    await redis?.del(`userFolders:${userId}`);

    // delete folder (files auto deleted via CASCADE)
    await db.query(`DELETE FROM folders WHERE id=$1 AND user_id=$2`, [
      folderId,
      userId,
    ]);

    return res.status(200).json({
      message: "Folder deleted successfully",
    });
  } catch (err) {
    console.error("Delete folder error:", err.message);
    return res.status(500).json({ error: "Error deleting folder" });
  }
};

export const updateFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { folderToUpdate, category, folderId } = req.body;

    // ✅ validation
    if (!folderId || !folderToUpdate || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!["PUBLIC", "PRIVATE"].includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const result = await db.query(
      `
      UPDATE folders
      SET folder_name = $1, category = $2
      WHERE id = $3 AND user_id = $4
      `,
      [folderToUpdate.trim(), category, folderId, userId]
    );

    // ✅ check ownership & existence
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: "Folder not found or unauthorized" });
    }

    return res.status(200).json({
      message: "Folder updated successfully",
    });
  } catch (err) {
    console.error("Update folder error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

