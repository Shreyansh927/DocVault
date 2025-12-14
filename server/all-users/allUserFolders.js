import { db } from "../db.js";

export const allUserFolders = async (req, res) => {
  try {
    const { email } = req.query;

    const user = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "user not found" });
    }

    const userId = user.rows[0].id;
    const allFolders = await db.query(
      `SELECT * FROM folders WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    res.status(200).json({ allUserFolders: allFolders.rows, message: "DONE" });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Cannot fetch all folders" });
  }
};
