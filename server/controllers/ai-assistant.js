import { db } from "../db.js";
import { aiQueryQueue } from "../queue/aiQueryQueue.js";

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const countResult = await db.query(
      `
  SELECT COUNT(*) AS count
  FROM ai_query_jobs
  WHERE
    user_id = $1
    AND status='COMPLETED'
    AND is_seen=false
  `,
      [userId],
    );

    const latestResult = await db.query(
      `
  SELECT query, response, is_seen
  FROM ai_query_jobs
  WHERE
    user_id = $1
    AND status='COMPLETED'
    AND is_seen=false
  ORDER BY completed_at DESC
  LIMIT 1
  `,
      [userId],
    );

    return res.json({
      count: Number(countResult.rows[0].count),
      query: latestResult.rows[0]?.query ?? "",
      response: latestResult.rows[0]?.response ?? "",
      is_seen: latestResult.rows[0]?.is_seen ?? true,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      error: "Something went wrong",
    });
  }
};

export const markResponsesAsSeen = async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query(
      `
      UPDATE ai_query_jobs
      SET is_seen=true
      WHERE user_id=$1 AND status='COMPLETED' AND is_seen=false
      `,
      [userId],
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: "Something went wrong",
    });
  }
};

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

    const job = await aiQueryQueue.add("ai-query", {
      jobId,
      userId,
      query,
    });

    console.log("Job Added:", job.id);

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
