import express from "express";

import { upload } from "../middleware/multer.js";
import { uploadFiles } from "../controllers/fileController.js";

const fileRoutes = express.Router();

fileRoutes.post("/upload", upload.array("files", 10), uploadFiles);

export default fileRoutes;
