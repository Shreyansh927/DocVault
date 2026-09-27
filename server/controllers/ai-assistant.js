import { db } from "../db.js";
import { aiQueryQueue } from "../queue/aiQueryQueue.js";
import jwt from "jsonwebtoken";

export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const countResult = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM ai_query_jobs
      WHERE
        user_id = $1
        AND is_seen = false
        AND status IN ('COMPLETED', 'WAITING_FOR_APPROVAL')
      `,
      [userId],
    );

    const latestResult = await db.query(
      `
      SELECT
        id,
        query,
        response,
        hitl_request,
        is_seen,
        status
      FROM ai_query_jobs
      WHERE
        user_id = $1
        AND is_seen = false
        AND status IN ('COMPLETED', 'WAITING_FOR_APPROVAL')
      ORDER BY
        CASE
          WHEN status = 'WAITING_FOR_APPROVAL' THEN 0
          ELSE 1
        END,
        COALESCE(completed_at, created_at) DESC
      LIMIT 1
      `,
      [userId],
    );

    const latest = latestResult.rows[0];

    return res.json({
      count: Number(countResult.rows[0].count),
      id: latest?.id ?? null,
      query: latest?.query ?? "",
      response: latest?.response ?? "",
      hitl_request: latest?.hitl_request ?? null,
      is_seen: latest?.is_seen ?? true,
      status: latest?.status ?? null,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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
      SET is_seen = true
      WHERE user_id = $1
        AND is_seen = false
        AND status IN ('COMPLETED', 'WAITING_FOR_APPROVAL')
      `,
      [userId],
    );

    return res.status(200).json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
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

    // Create short-lived internal credential for MCP
    const mcpToken = jwt.sign(
      {
        userId,
        purpose: "docvault-mcp",
      },
      process.env.MCP_INTERNAL_SECRET,
      {
        expiresIn: "15m",
      },
    );

    const job = await aiQueryQueue.add("ai-query", {
      jobId,
      userId,
      query,
      mcpToken,
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
