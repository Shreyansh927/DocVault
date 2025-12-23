import express from "express";
import { upload } from "../middleware/multer.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  editUserProfile,
  personalInfo,
} from "../personal-info/personal-info.js";

const personalRoute = express.Router();

personalRoute.get("/me", authMiddleware, personalInfo);

personalRoute.post(
  "/edit",
  authMiddleware,
  upload.single("profileImage"),
  editUserProfile
);

export default personalRoute;
