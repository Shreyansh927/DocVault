import dotenv from "dotenv";
dotenv.config();

import supabase from "../supabase.js";

/* ================= CONSTANTS ================= */
const BUCKET_NAME = "project2-bucket";

/* ================= HELPERS ================= */
const sanitizeFileName = (name) =>
  name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/* ================= USER JSON BACKUP ================= */
export const usersBackup = async (user) => {
  assert(user?.email, "Invalid user data");

  const filePath = `users/user_${sanitizeFileName(user.email)}.json`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, JSON.stringify(user, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("❌ Supabase user backup failed:", error.message);
    throw error;
  }

  return true;
};

/* ================= PROFILE IMAGE UPLOAD ================= */
export const uploadProfileImageToSupabase = async (user, file) => {
  assert(user?.public_id, "Invalid user");
  assert(file, "Missing file");

  const safeName = sanitizeFileName(file.originalname);
  const storagePath = `profile-images/user_${
    user.public_id
  }/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error("❌ Profile image upload failed:", error.message);
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return data.publicUrl;
};

/* ================= FILE UPLOAD (USER DATA) ================= */
export const uploadFilesToSupabase = async (userId, folderId, file) => {
  assert(userId, "Missing userId");
  assert(folderId, "Missing folderId");
  assert(file, "Missing file");

  const safeName = sanitizeFileName(file.originalname);

  const storagePath = `data/user_${userId}/folder_${folderId}/${Date.now()}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) {
    console.error("❌ Supabase file upload failed:", error.message);
    throw error;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
  };
};
