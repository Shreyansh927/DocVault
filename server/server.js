import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

import { initDB } from "./db.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
// import { apiLimiter } from "./middleware/rateLimiter.js";

import authRoutes from "./routes/authRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import fileRoutes from "./routes/fileRoutes.js";
import forgotPasswordRoute from "./routes/forgotPasswordRoute.js";
import personalRoute from "./routes/personalInfoRoutes.js";
import router from "./routes/connectionRoute.js";
import { allUsers } from "./all-users/allUsers.js";
import { allUserFolders } from "./all-users/allUserFolders.js";
import { allFiles, trashFiles } from "./all-users/all-folder-files.js";

import "./permanent-deletion-job.js";

const app = express();
const server = http.createServer(app);

/* ---------- CORE ---------- */
// app.set("trust proxy", 1);
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-future-frontend.onrender.com",
    ],
    credentials: true,
  })
);

/* ---------- SOCKET ---------- */
export const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("register", (userId) => {
    socket.join(userId);
  });
});

// /* ---------- LIMITER ---------- */
// app.use("/api", apiLimiter);

/* ---------- ROUTES ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/forgot", forgotPasswordRoute);
app.use("/api/user-profile", authMiddleware, personalRoute);

app.get("/", (req, res) => {
  res.send("API is running");
});

// app.get("/api/get-all-folders", authMiddleware, allUserFolders);
app.get("/api/get-all-files", authMiddleware, allFiles);
app.get("/api/get-all-trash-files", authMiddleware, trashFiles);

app.use("/api/folder-auth", authMiddleware, folderRoutes);
app.use("/api/files", authMiddleware, fileRoutes);

app.use("/api", router);
app.get("/api/all-users", authMiddleware, allUsers);

/* ---------- START ---------- */
const PORT = process.env.PORT || 4000;

initDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
