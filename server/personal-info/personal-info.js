import { db } from "../db.js";
import { uploadProfileImageToSupabase } from "../utils/supabase-cloud-storage-users-backup.js";

/* ================= GET PROFILE ================= */
export const personalInfo = async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await db.query(
      `SELECT id, name, email, phone_number, profile_image, public_id, created_at
       FROM users WHERE id=$1`,
      [userId],
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "Profile fetched",
      userPersonalInfoObj: userRes.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching profile" });
  }
};

/* ================= EDIT PROFILE ================= */
export const editUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phoneNumber } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ error: "Missing fields" });
    }

    let profileImageUrl = null;
    const user = await db.query(`SELECT public_id FROM users WHERE id=$1`, [
      userId,
    ]);
    const publicId = user.rows[0]?.public_id;

    
    if (req.file) {
      profileImageUrl = await uploadProfileImageToSupabase(
        { public_id: publicId },
        req.file,
      );
    }

    await db.query(
      `UPDATE users
       SET name=$1,
           phone_number=$2,
           profile_image=COALESCE($3, profile_image)
       WHERE id=$4`,
      [name, phoneNumber, profileImageUrl, userId],
    );

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("EDIT PROFILE ERROR:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
};
