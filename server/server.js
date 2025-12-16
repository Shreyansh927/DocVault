// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { initDB } from "./db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import folderRoute from "./routes/folderRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import forgotPasswordRoute from "./routes/forgotPasswordRoute.js";

import { allUsers } from "./all-users/allUsers.js";
import { allUserFolders } from "./all-users/allUserFolders.js";
import allFiles from "./all-users/all-folder-files.js";

const app = express();

// ---------- Core Middlewares ----------
app.use(express.json());
app.use(cookieParser());

// ---------- CORS ----------
app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true, // allow cookies
  })
);

// ---------- Public Routes (NO AUTH REQUIRED) ----------

// Auth (login, signup)
app.use("/api/auth", authRoutes);

// Forgot password (email-based reset)
app.use("/api/forgot", forgotPasswordRoute);

// Health check
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ---------- Protected Routes (AUTH REQUIRED) ----------

// Fetch all users (admin / internal usage)
app.use("/all-users", authMiddleware, allUsers);

// Fetch all folders of users
app.use("/get-all-folders", authMiddleware, allUserFolders);

// Fetch all files of folders
app.use("/get-all-files", authMiddleware, allFiles);

// Folder creation / access
app.use("/folder-auth", authMiddleware, folderRoute);

// File upload / access
app.use("/files", authMiddleware, fileRoutes);

// ---------- Start Server After DB Init ----------
const PORT = process.env.PORT || 4000;

initDB()
  .then(() => {
    console.log("✅ Database initialized");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize DB:", err);
  });
