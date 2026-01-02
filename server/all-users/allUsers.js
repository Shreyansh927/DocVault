import { db } from "../db.js";
import { redis } from "../redis.js";

/* ================= GET ALL USERS (EXCEPT SELF) ================= */
export const allUsers = async (req, res) => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await db.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.name,
        u.profile_image
      FROM users u
      WHERE u.id <> $1
        AND NOT EXISTS (
          SELECT 1
          FROM friends f
          WHERE f.user_id = $1
            AND f.friend_id = u.id
        )
      ORDER BY u.created_at DESC
      `,
      [currentUserId]
    );

    return res.status(200).json({
      otherUsers: result.rows,
      source: "db",
    });
  } catch (err) {
    console.error("ALL USERS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
};

