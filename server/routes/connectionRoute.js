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
  
  removeFriend,
  getAccessControl,
} from "../friend-requests/request.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getNotifications } from "../friend-requests/notificatoins.js";
const connectionRouter = express.Router();

connectionRouter.post("/connect", authMiddleware, sendRequest);
connectionRouter.post("/accept", authMiddleware, acceptRequest);
connectionRouter.post("/deny", authMiddleware, denyRequest);

connectionRouter.get("/connections", authMiddleware, getConnections);
connectionRouter.get("/access-control", authMiddleware, getAccessControl);
connectionRouter.post("/allow-folder-access", authMiddleware, allowShowFolder);
connectionRouter.post(
  "/deny-folder-access",
  authMiddleware,
  restrictShowFolder,
);
connectionRouter.post("/cancel-connection", authMiddleware, removeFriend);
connectionRouter.get(
  "/folders/shared/:userId",
  authMiddleware,
  
  getSharedFoldersPractice,
);
connectionRouter.get(
  "/folders/files/shared/:friendId/:folderId",
  authMiddleware,

  getSharedFiles,
);
connectionRouter.get(
  "/folders/files/file/shared/:friendId/:folderId/:fileId",
  authMiddleware,

  getSharedFileView,
);
connectionRouter.get("/notifications", authMiddleware, getNotifications);

export default connectionRouter;
