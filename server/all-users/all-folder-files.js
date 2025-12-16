import { db } from "../db.js";

const allFiles = async (req, res) => {
  try {
    const { email, folderId } = req.query;

    if (!email || !folderId) {
      return res.status(400).json({ error: "missing credentials" });
    }

    // verify user
    const user = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);

    if (!user.rows.length) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = user.rows[0].id;

    // verify folder ownership

    const folder = await db.query(
      `SELECT * FROM folders WHERE id=$1 AND user_id=$2`,
      [folderId, userId]
    );
    if (!folder.rows.length) {
      return res.status(404).json({ error: "folder not found" });
    }

    // fetching all files of the folder

    const files = await db.query(
      `SELECT * FROM files WHERE folder_id=$1 ORDER BY created_at DESC`,
      [folderId]
    );

    return res
      .status(200)
      .json({ message: "files fetched successfully", allFiles: files.rows });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "error in fetching files" });
  }
};

export default allFiles;
