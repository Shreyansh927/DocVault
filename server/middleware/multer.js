import multer from "multer";
// import fs from "fs";
// import path from "path";

export const upload = multer({
  storage: multer.memoryStorage(),
});
