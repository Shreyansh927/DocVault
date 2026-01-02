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
  getSharedFileView,
  checkFolderAccess,
  removeFriend,
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
router.post("/cancel-connection", authMiddleware, removeFriend);
router.get(
  "/folders/shared/:userId",
  authMiddleware,
  checkFolderAccess,
  getSharedFoldersPractice
);
router.get(
  "/folders/files/shared/:friendId/:folderId",
  authMiddleware,

  getSharedFiles
);
router.get(
  "/folders/files/file/shared/:friendId/:folderId/:fileId",
  authMiddleware,

  getSharedFileView
);
router.get("/notifications", authMiddleware, getNotifications);

export default router;
