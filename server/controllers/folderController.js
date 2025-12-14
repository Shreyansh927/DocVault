import { db } from "../db.js";

export const addFolder = async (req, res) => {
  try {
    const { folderName, email } = req.body;

    if (!folderName || !email) {
      return res.status(400).json({ error: "Missing data" });
    }

    // get user id from email
    const userResult = await db.query(`SELECT id FROM users WHERE email=$1`, [
      email,
    ]);

    if (!userResult.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const userId = userResult.rows[0].id;

    // check folder exists
    const exists = await db.query(
      `SELECT id FROM folders WHERE folder_name=$1 AND user_id=$2`,
      [folderName, userId]
    );

    if (exists.rows.length) {
      return res.status(409).json({ error: "Folder already exists" });
    }

    await db.query(
      `INSERT INTO folders (folder_name, user_id) VALUES ($1, $2)`,
      [folderName, userId]
    );

    await db.query(`SELECT * FROM folders WHERE user_id=$1`, [userId]);

    res.status(201).json({
      message: "Folder created successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Problem in adding folder" });
  }
};
