import { listFailedJobs } from "./listfailedJobs.js";

try {
  const result = await listFailedJobs(10);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Failed to retrieve jobs:", error.message);
  process.exitCode = 1;
}
