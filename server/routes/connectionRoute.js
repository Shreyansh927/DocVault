import express from "express";
import {
  sendRequest,
  acceptRequest,
  denyRequest,
  getConnections,
  getSharedFoldersPractice,
  allowShowFolder,
  restrictShowFolder,
  getSharedFiles,
} from "../friend-requests/request.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getNotifications } from "../friend-requests/notificatoins.js";
const router = express.Router();

router.post("/connect", authMiddleware, sendRequest);
router.post("/accept", authMiddleware, acceptRequest);
router.post("/deny", authMiddleware, denyRequest);

router.get("/connections", authMiddleware, getConnections);
router.post("/allow-folder-access", authMiddleware, allowShowFolder);
router.post("/deny-folder-access", authMiddleware, restrictShowFolder);
router.get("/folders/shared/:userId", authMiddleware, getSharedFoldersPractice);
router.get(
  "/folders/files/shared/:friendId/:folderId",
  authMiddleware,
  getSharedFiles
);
router.get("/notifications", authMiddleware, getNotifications);

export default router;
