import multer from "multer";
// import fs from "fs";
// import path from "path";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
