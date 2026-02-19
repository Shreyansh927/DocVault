import { db } from "../db.js";
import { redis } from "../redis.js";

const CACHE_TTL = 300; // 5 minutes

export const allUserFolders = async (req, res) => {
  const userId = req.user?.id;
  const cacheKey = `userFolders:${userId}`;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // /* ================= CACHE READ ================= */
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          allUserFolders: JSON.parse(cached),
          source: "cache",
        });
      }
    } catch (err) {
      console.warn("Redis read failed:", err.message);
    }
  }

  /* ================= DATABASE ================= */
  try {
    const foldersRes = await db.query(
      `
      SELECT 
        folders.id,
        folders.folder_name,
        folders.created_at,
        folders.category
      FROM folders INNER JOIN users ON folders.user_id = users.id
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    /* ================= CACHE WRITE ================= */
    if (redis) {
      try {
        await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(foldersRes.rows));
      } catch (err) {
        console.warn("Redis write failed:", err.message);
      }
    }

    return res.status(200).json({
      allUserFolders: foldersRes.rows,
      source: "db",
    });
  } catch (err) {
    console.error("Fetch folders error:", err.message);
    return res.status(500).json({ error: "Failed to fetch folders" });
  }
};
