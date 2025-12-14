// server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();

import { initDB } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import folderRoute from "./routes/folderRoutes.js";
import forgotPasswordRoute from "./routes/forgotPasswordRoute.js";
import { allUsers } from "./all-users/allUsers.js";
import { allUserFolders } from "./all-users/allUserFolders.js";

const app = express();

// ---------- Middlewares ----------
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173", // your frontend
    credentials: true,
  })
);
// ---- Other users
app.use("/all-users", allUsers);

// ---- fetch all user folders
app.use("/get-all-folders", allUserFolders);

// ---------- API Routes ----------
app.use("/api/auth", authRoutes);

// -- add folders
app.use("/folder-auth", folderRoute);

// Forgot Password Route API
app.use("/api/forgot", forgotPasswordRoute);

// ---------- Health Check ----------
app.get("/", (req, res) => {
  res.send("API is running...");
});

// ---------- Start Server Only After DB Initializes ----------
const PORT = process.env.PORT || 4000;

initDB()
  .then(() => {
    console.log("Database initialized");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize DB:", err);
  });
