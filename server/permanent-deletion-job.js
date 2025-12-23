// server/permanent-deletion-job.js
import cron from "node-cron";
import { deleteExpiredFiles } from "./controllers/fileController.js";

// Runs every minute
cron.schedule("* * * * *", async () => {
  console.log("Running minutely permanent delete job...");
  await deleteExpiredFiles();
});
