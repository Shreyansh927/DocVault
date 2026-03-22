import express from "express";

import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { initDB } from "./db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";

import authRoutes from "./routes/authRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import forgotPasswordRoute from "./routes/forgotPasswordRoute.js";
import personalRoute from "./routes/personalInfoRoutes.js";
import connectionRoutes from "./routes/connectionRoute.js";
import messageRouter from "./routes/messagesRoutes.js";
import { authLimiter, aiLimiter } from "./middleware/rateLimiter.js";
import { db } from "./db.js";
import { allUsers } from "./all-users/allUsers.js";
import { allFiles, trashFiles } from "./all-users/all-folder-files.js";

import aiResponseRouter from "./routes/ai-query-response-route.js";
import "./permanent-deletion-job.js";

const app = express();

/* ---------- CORE ---------- */
app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "https://docvault-frontend-ba1a.onrender.com",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

/* ---------- ROUTES ---------- */
app.get("/", (req, res) => {
  res.send("API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/forgot", forgotPasswordRoute);
app.use("/api/user-profile", authMiddleware, personalRoute);

app.use("/ai-query-response", aiResponseRouter);

app.get("/api/get-all-files/:folderId/:timeline", authMiddleware, allFiles);
app.get("/api/get-all-trash-files", authMiddleware, trashFiles);

app.use("/api/folder-auth", authMiddleware, folderRoutes);
app.use("/api/files", authMiddleware, fileRoutes);

app.use("/api", authMiddleware, connectionRoutes);
app.use("/api/messages", authMiddleware, messageRouter);
app.get("/api/all-users", authMiddleware, allUsers);
app.get("/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB failed" });
  }
});
/* ---------- START ---------- */
const PORT = process.env.PORT || 4000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

initDB()
  .then(() => console.log("DB initialized"))
  .catch((err) => console.error("DB failed:", err));
