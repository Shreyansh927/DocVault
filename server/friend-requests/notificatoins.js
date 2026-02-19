import { db } from "../db.js";

export const getNotifications = async (req, res) => {
  try {
    const userAuthUUID = req.user?.auth_uuid;

    if (!userAuthUUID) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result = await db.query(
      `
      SELECT
        id,
        sender_id,
        sender_name,
        sender_profile_image,
        type,
        status,
        seen,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userAuthUUID]
    );

    res.status(200).json({ notifications: result.rows });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};
