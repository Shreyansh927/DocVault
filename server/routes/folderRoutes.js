import { addFolder } from "../controllers/folderController.js";

import express from "express";

const folderRoute = express.Router();

folderRoute.post("/add-folder", addFolder);

export default folderRoute;
