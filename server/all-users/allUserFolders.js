import { db } from "../db.js";

export const allUserFolders = async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await db.query(`SELECT name FROM users WHERE id=$1`, [
      userId,
    ]);

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const allFolders = await db.query(
      `SELECT * FROM folders WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );

    res.status(200).json({
      allUserFolders: allFolders.rows,
      name: userRes.rows[0].name,
      message: "DONE",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cannot fetch all folders" });
  }
};
