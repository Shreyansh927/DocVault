import { allUserFolders } from "../all-users/allUserFolders.js";
import {
  addFolder,
  deleteFolder,
  updateFolder,
} from "../controllers/folderController.js";

import express from "express";

const folderRoute = express.Router();

folderRoute.get("/get-all-folders", allUserFolders)
folderRoute.post("/add-folder", addFolder);
folderRoute.post("/delete-folder", deleteFolder);
folderRoute.post("/update-folder", updateFolder);

export default folderRoute;
