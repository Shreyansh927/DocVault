import { Command } from "@langchain/langgraph";
import { graph } from "../ai/graphs/graph.js";
import { db } from "../db.js";

export const handleHITLDecision = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { decision } = req.body;
    const userId = req.user.id;

    console.log("=================================");
    console.log("===== HITL DECISION =====");
    console.log("=================================");
    console.log("jobId:", jobId);
    console.log("userId:", userId);
    console.log("decision:", decision);

    // --------------------------------------------------
    // 1. Validate decision
    // --------------------------------------------------

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Invalid HITL decision",
      });
    }

    // --------------------------------------------------
    // 2. Verify job belongs to user
    // --------------------------------------------------

    const jobResult = await db.query(
      `
      SELECT
        id,
        user_id,
        status,
        hitl_request
      FROM ai_query_jobs
      WHERE id = $1
        AND user_id = $2
      `,
      [jobId, userId],
    );

    if (!jobResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "AI query job not found",
      });
    }

    const job = jobResult.rows[0];

    console.log("Current job status:", job.status);

    // --------------------------------------------------
    // 3. Prevent duplicate HITL decisions
    // --------------------------------------------------

    if (job.status !== "WAITING_FOR_APPROVAL") {
      return res.status(400).json({
        success: false,
        message: `Job is not waiting for approval. Current status: ${job.status}`,
      });
    }

    // --------------------------------------------------
    // 4. IMPORTANT:
    //    Same thread ID used by the BullMQ worker
    // --------------------------------------------------

    const threadId = `${userId}:${jobId}`;

    console.log("Thread ID:", threadId);

    // --------------------------------------------------
    // 5. Mark job as processing BEFORE resuming
    // --------------------------------------------------

    await db.query(
      `
      UPDATE ai_query_jobs
      SET status = 'PROCESSING'
      WHERE id = $1
        AND user_id = $2
        AND status = 'WAITING_FOR_APPROVAL'
      `,
      [jobId, userId],
    );

    // --------------------------------------------------
    // 6. Optional but VERY useful:
    //    Inspect the checkpoint before resume
    // --------------------------------------------------

    console.log("===== CHECKING GRAPH STATE =====");

    const stateSnapshot = await graph.getState({
      configurable: {
        thread_id: threadId,
      },
    });

    console.dir(stateSnapshot, { depth: null });

    console.log("Graph next nodes:", stateSnapshot?.next);

    // If there is no checkpoint / interrupted node,
    // don't blindly call resume.
    if (!stateSnapshot || !stateSnapshot.next?.length) {
      console.error(
        "No resumable LangGraph checkpoint found for thread:",
        threadId,
      );

      await db.query(
        `
        UPDATE ai_query_jobs
        SET
          status = 'FAILED',
          hitl_request = NULL
        WHERE id = $1
          AND user_id = $2
        `,
        [jobId, userId],
      );

      return res.status(500).json({
        success: false,
        message: "No resumable LangGraph checkpoint found",
      });
    }

    if (decision === "rejected") {
      await db.query(
        `UPDATE ai_query_jobs
      SET
        status = 'COMPLETED',
        hitl_request = NULL,
        completed_at = NOW(),
        response = 'file movement called off successfully.'
      WHERE id = $1
        AND user_id = $2 `,
        [jobId, userId],
      );
    }

    // --------------------------------------------------
    // 7. Resume LangGraph
    // --------------------------------------------------

    console.log("=================================");
    console.log("===== BEFORE GRAPH RESUME =====");
    console.log("=================================");

    const result = await graph.invoke(
      new Command({
        resume: decision,
      }),
      {
        configurable: {
          thread_id: threadId,
        },
        runName: "DocVault AI HITL Resume",
        metadata: {
          jobId,
          userId,
          source: "hitl-controller",
          decision,
        },
        tags: ["docvault", "hitl", "resume"],
      },
    );

    console.log("=================================");
    console.log("===== AFTER GRAPH RESUME =====");
    console.log("=================================");

    console.dir(result, { depth: null });

    // --------------------------------------------------
    // 8. Check whether graph hit another interrupt
    // --------------------------------------------------

    if (result?.__interrupt__) {
      console.log("Graph interrupted again:");

      console.dir(result.__interrupt__, { depth: null });

      await db.query(
        `
        UPDATE ai_query_jobs
        SET
          status = 'WAITING_FOR_APPROVAL',
          hitl_request = $1::jsonb
        WHERE id = $2
          AND user_id = $3
        `,
        [JSON.stringify(result.__interrupt__[0].value), jobId, userId],
      );

      return res.status(200).json({
        success: true,
        status: "waiting_for_approval",
        interrupted: true,
        result,
      });
    }

    // --------------------------------------------------
    // 9. Graph completed
    // --------------------------------------------------

    await db.query(
      `
      UPDATE ai_query_jobs
      SET
        status = 'COMPLETED',
        hitl_request = NULL,
        completed_at = NOW(),
        response = 'file movement successfully processed.'
      WHERE id = $1
        AND user_id = $2
      `,
      [jobId, userId],
    );

    // --------------------------------------------------
    // 10. Return graph result
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      status: "completed",
      decision,
      result,
    });
  } catch (error) {
    console.error("=================================");
    console.error("===== HITL ERROR =====");
    console.error("=================================");
    console.error(error);

    // Try to mark the job as failed
    try {
      const { jobId } = req.params;
      const userId = req.user.id;

      await db.query(
        `
        UPDATE ai_query_jobs
        SET
          status = 'FAILED',
          hitl_request = NULL
        WHERE id = $1
          AND user_id = $2
        `,
        [jobId, userId],
      );
    } catch (dbError) {
      console.error("Failed to update job status after HITL error:", dbError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process HITL decision",
    });
  }
};
