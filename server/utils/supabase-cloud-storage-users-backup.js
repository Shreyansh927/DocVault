import dotenv from "dotenv";
dotenv.config();
import supabase from "../supabase.js";

/* ---------------- User Backup ---------------- */
export const usersBackup = async (user) => {
  if (!user || !user.email) {
    throw new Error("Invalid user data");
  }

  const filePath = `users/user_${user.email}.json`;

  const { error } = await supabase.storage
    .from("project2-bucket")
    .upload(filePath, JSON.stringify(user, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("Supabase storage backup failed:", error.message);
    throw error;
  }
};

/* ---------------- Upload Files ---------------- */
const sanitizeFileName = (name) => {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
};
export const uploadFilesToSupabase = async (userId, folderId, file) => {
  if (!userId || !folderId || !file) {
    throw new Error("Missing data");
  }
  const safeName = sanitizeFileName(file.originalname);

  // Clean & valid storage path
  const storagePath = `data/user_${userId}/folder_${folderId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from("project2-bucket")
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error("Supabase upload failed:", error.message);
    throw error;
  }

  //  Get public URL
  const { data } = supabase.storage
    .from("project2-bucket")
    .getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
    fileName: safeName,
    mimeType: file.mimetype,
    size: file.size,
  };
};
