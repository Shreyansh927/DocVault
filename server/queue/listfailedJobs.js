import { aiQueryQueue } from "./aiQueryQueue.js";

export async function listFailedJobs(limit = 10) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

  const jobs = await aiQueryQueue.getFailed(0, safeLimit - 1);

  const failedJobs = await Promise.all(
    jobs.map(async (job) => ({
      queueName: "ai-query-processing",
      bullmqJobId: job.id,
      applicationJobId: job.data?.jobId ?? null,
      name: job.name,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts ?? 1,
      failedReason: job.failedReason ?? null,
      stacktrace: (job.stacktrace ?? []).slice(-3),
      timestamp: job.timestamp ?? null,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    })),
  );

  return {
    queueName: "ai-query-processing",
    count: failedJobs.length,
    jobs: failedJobs,
  };
}
