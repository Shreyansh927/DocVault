import { db } from "../db.js";

export const getNotifications = async (req, res) => {
  const userId = req.user.id;

  const result = await db.query(
    `
    SELECT *
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    `,
    [userId]
  );

  res.json({ notifications: result.rows });
};
