import {
  sendMessage,
  getMessages,
  deleteMessage,
  editMessage,
} from "../controllers/messaging.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const messageRouter = express.Router();

messageRouter.post("/send/:recieverID/:chatID", authMiddleware, sendMessage);
messageRouter.delete(
  "/delete/:chatID/:messageId",
  authMiddleware,
  deleteMessage,
);
messageRouter.put("/edit/:chatID/:messageId", authMiddleware, editMessage);
messageRouter.get("/get/:chatID", authMiddleware, getMessages);
export default messageRouter;
