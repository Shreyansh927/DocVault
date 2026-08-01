import { db } from "../db.js";
import { aiQueryQueue } from "../queue/aiQueryQueue.js";

export const aiQueryResponse = async (req, res) => {
  try {
    const userId = req.user.id;
    const query = req.query.q;

    if (!query?.trim()) {
      return res.status(400).json({
        error: "Query is required",
      });
    }

    const jobEntry = await db.query(
      `
      INSERT INTO ai_query_jobs
      (
        user_id,
        query,
        status,
        created_at
      )
      VALUES
      ($1,$2,'QUEUED',NOW())
      RETURNING id
      `,
      [userId, query],
    );

    const jobId = jobEntry.rows[0].id;

    await aiQueryQueue.add("ai-query", {
      jobId,
      userId,
      query,
    });

    return res.status(202).json({
      success: true,
      jobId,
      status: "QUEUED",
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to queue AI request",
    });
  }
};
