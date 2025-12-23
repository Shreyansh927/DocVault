import { db } from "../db.js";

export const viewIndividualFile = async (req, res) => {
  try {
    const { folderId, fileId } = req.params;
    const userId = req.user.id;

    if (!folderId || !fileId) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const result = await db.query(
      `
      SELECT 
        f.id,
        f.filename,
        f.size,
        f.created_at,
        f.ai_summary,
        f.encrypted_link
      FROM files f
      JOIN folders fo ON f.folder_id = fo.id
      WHERE f.id = $1
        AND f.folder_id = $2
        AND fo.user_id = $3
      `,
      [fileId, folderId, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "File not found or access denied" });
    }

    res.status(200).json({ file: result.rows[0] });
  } catch (err) {
    console.error("VIEW FILE ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
