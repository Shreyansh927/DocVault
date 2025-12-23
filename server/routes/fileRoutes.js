import express from "express";
import { upload } from "../middleware/multer.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  uploadFiles,
  deleteFile,
  deleteAllFiles,
  restoreFile,
  restoreAllFiles,
  downloadFile,
} from "../controllers/fileController.js";
import { viewIndividualFile } from "../all-users/indivisualFile.js";

const fileRoutes = express.Router();

fileRoutes.post(
  "/upload",
  authMiddleware,
  upload.array("files", 10),
  uploadFiles
);

fileRoutes.get("/:fileId/download", authMiddleware, downloadFile);
fileRoutes.get("/:folderId/:fileId", authMiddleware, viewIndividualFile);

fileRoutes.post("/delete-file", authMiddleware, deleteFile);
fileRoutes.post("/delete-all-files", authMiddleware, deleteAllFiles);
fileRoutes.post("/restore-file", authMiddleware, restoreFile);
fileRoutes.post("/restore-all-files", authMiddleware, restoreAllFiles);

export default fileRoutes;
