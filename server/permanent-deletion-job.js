import cron from "node-cron";
import {
  deleteExpiredFilesService,
  fileHealthCheck,
} from "./controllers/fileController.js";

cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running minutely permanent delete job...");
    await deleteExpiredFilesService();
    await fileHealthCheck();
    console.log("Expired files permanently deleted");
  } catch (err) {
    console.error("Permanent deletion job failed:", err.message);
  }
});
