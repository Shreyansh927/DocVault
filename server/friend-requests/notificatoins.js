import { db } from "../db.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user?.id);

    if (!userId) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const result = await db.query(
      `
      SELECT
        id,
        sender_id,
        sender_name,
        sender_profile_image,
        text_notification,
        file_route,
        type,
        status,
        seen,
        created_at,
        room_name,
        room_id
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId],
    );

    console.log("REQ.USER:", req.user);

    console.log(
      "Notifications fetched for user:",
      userId,
      "Count:",
      result.rows.length,
    );

    return res.status(200).json({
      notifications: result.rows,
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch notifications",
    });
  }
};
