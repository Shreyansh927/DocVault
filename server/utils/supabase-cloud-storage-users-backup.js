import dotenv from "dotenv";
dotenv.config();
import supabase from "../supabase.js";

export const usersBackup = async (user) => {
  const filePath = `users/user_${user.email}.json`;

  const { error } = await supabase.storage
    .from("project2-bucket")
    .upload(filePath, JSON.stringify(user, null, 2), {
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    console.error("Supabase storage backup failed:", error.message);
  }
};
