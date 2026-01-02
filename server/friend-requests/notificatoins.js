import { db } from "../db.js";
import { redis } from "../redis.js";

/* ================= GET NOTIFICATIONS ================= */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // const cacheKey = `notifications:user:${userId}`;

    // /* ---------- CACHE READ ---------- */
    // if (redis) {
    //   try {
    //     const cachedData = await redis.get(cacheKey);
    //     if (cachedData) {
    //       return res.status(200).json({
    //         notifications: JSON.parse(cachedData),
    //         source: "cache",
    //       });
    //     }
    //   } catch {
    //     console.warn("Redis read failed, falling back to DB");
    //   }
    // }

    /* ---------- DB QUERY ---------- */
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
      [userId]
    );

    /* ---------- CACHE WRITE ---------- */
    // if (redis) {
    //   try {
    //     await redis.setEx(cacheKey, 300, JSON.stringify(result.rows));
    //   } catch {
    //     console.warn("Redis write failed");
    //   }
    // }

    return res.status(200).json({
      notifications: result.rows,
      source: "db",
    });
  } catch (err) {
    console.error("GET NOTIFICATIONS ERROR:", err.message);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};
