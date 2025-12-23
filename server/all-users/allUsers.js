import { db } from "../db.js";

export const allUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const result = await db.query(
      `
      SELECT
        id,
        public_id,
        name,
        profile_image
      FROM users
      WHERE id != $1
      `,
      [currentUserId]
    );

    res.json({ otherUsers: result.rows });
  } catch (err) {
    console.error("ALL USERS ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
