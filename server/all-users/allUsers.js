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
    u.profile_image,
    n.status
FROM users u

LEFT JOIN notifications n
ON n.sender_id = $1
AND n.user_id = u.auth_uuid
AND n.type = 'FRIEND_REQUEST'

WHERE u.id <> $1;
      `,
      [currentUserId],
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
