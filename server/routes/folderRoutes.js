import { addFolder, deleteFolder } from "../controllers/folderController.js";

import express from "express";

const folderRoute = express.Router();

folderRoute.post("/add-folder", addFolder);
folderRoute.post("/delete-folder", deleteFolder);

export default folderRoute;
