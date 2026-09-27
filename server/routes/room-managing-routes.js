import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { createRoom } from "../room-management/createRoom.js";
import { allRoomMembersOfIndivisualRoomId } from "../room-management/allRoomMembers.js";

const roomRouter = express.Router();

roomRouter.post("/create-room", authMiddleware, createRoom);
roomRouter.get(
  "/get-current-room-members",
  authMiddleware,
  allRoomMembersOfIndivisualRoomId,
);

export default roomRouter;
