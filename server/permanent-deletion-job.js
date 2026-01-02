import cron from "node-cron";
import { deleteExpiredFilesService } from "./controllers/fileController.js";

cron.schedule("* * * * *", async () => {
  try {
    console.log("Running minutely permanent delete job...");
    await deleteExpiredFilesService();
    console.log("Expired files permanently deleted");
  } catch (err) {
    console.error("Permanent deletion job failed:", err.message);
  }
});
