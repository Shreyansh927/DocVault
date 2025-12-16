import { db } from "../db.js";
// import { imagekit } from "../imagekit.js";
import { uploadFilesToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";

export const uploadFiles = async (req, res) => {
  try {
    const { email, folderId } = req.body;
    const files = req.files;

    if (!email || !folderId || !files || files.length === 0) {
      return res.status(401).json({ error: "missing credentials" });
    }
    const user = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);

    if (!user.rows.length) {
      return res.status(400).json({ error: "user not found" });
    }
    const userId = user.rows[0].id;

    const folder = await db.query(
      `SELECT * FROM folders WHERE id = $1 AND user_id=$2`,
      [folderId, userId]
    );

    if (!folder.rows.length) {
      return res.status(403).json({ error: "unauthorized access" });
    }

    const uploadedFiles = [];

    for (let file of files) {
      let fileUrl = "";

      // Imagekit upload for images

      if (file.mimetype.startsWith("image")) {
        const result = await imagekit.upload({
          file: file.buffer,
          fileName: file.originalname,
          folder: `/user_${userId}/folder_${folderId}`,
        });

        fileUrl = result.url;

        // docs/ videos ->> supabase
      } else {
        await uploadFilesToSupabase(userId, folderId, file);
      }

      const dbResponse = await db.query(
        `INSERT INTO files 
   (folder_id, filename, encrypted_name, encrypted_link, file_type, size)
   VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          folderId,
          file.originalname, // filename (original)
          `${Date.now()}_${file.originalname}`, // encrypted_name (unique)
          fileUrl, // encrypted_link (Supabase / ImageKit URL)
          file.mimetype,
          file.size,
        ]
      );

      uploadedFiles.push(dbResponse.rows[0]);
    }

    return res
      .status(200)
      .json({ message: "files uploaded successfully", files: uploadedFiles });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "Error" });
  }
};
