import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { composio } from "../utils/composioClient.js";

const router = Router();

const authConfigId = process.env.COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID;

if (!authConfigId) {
  throw new Error("COMPOSIO_GOOGLE_DRIVE_AUTH_CONFIG_ID is missing");
}

// Initiate Google Drive authorization for the logged-in user.
router.post("/connect", authMiddleware, async (req, res) => {
  try {
    const userId = String(req.user.id);

    if (!process.env.CLIENT_URL) {
      throw new Error("CLIENT_URL is missing");
    }

    const callbackUrl = new URL(
      "/settings/integrations",
      process.env.CLIENT_URL,
    ).toString();

    const connectionRequest = await composio.connectedAccounts.link(
      userId,
      authConfigId,
      {
        callbackUrl,
        alias: "docvault-google-drive",
      },
    );

    const connectedAccountId = connectionRequest.id;

    if (!connectedAccountId || !connectionRequest.redirectUrl) {
      throw new Error(
        "Composio did not return the expected connection details",
      );
    }

    await db.query(
      `INSERT INTO user_integrations
         (user_id, provider, connected_account_id, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, provider)
       DO UPDATE SET
         connected_account_id = EXCLUDED.connected_account_id,
         status = EXCLUDED.status,
         updated_at = NOW()`,
      [req.user.id, "google_drive", connectedAccountId, "INITIATED"],
    );

    return res.json({
      success: true,
      redirectUrl: connectionRequest.redirectUrl,
    });
  } catch (error) {
    console.error("Google Drive connection initiation failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return res.status(500).json({
      success: false,
      message: "Could not start Google Drive connection.",
    });
  }
});

// Check the connection belonging to the logged-in user.
router.get("/status", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT connected_account_id
       FROM user_integrations
       WHERE user_id = $1 AND provider = $2`,
      [req.user.id, "google_drive"],
    );

    const integration = result.rows[0];

    if (!integration?.connected_account_id) {
      return res.json({
        connected: false,
        status: "DISCONNECTED",
      });
    }

    const account = await composio.connectedAccounts.get(
      integration.connected_account_id,
    );

    const connected = account.status === "ACTIVE" && !account.isDisabled;

    await db.query(
      `UPDATE user_integrations
       SET status = $1, updated_at = NOW()
       WHERE user_id = $2 AND provider = $3`,
      [account.status, req.user.id, "google_drive"],
    );

    return res.json({
      connected,
      status: account.status,
    });
  } catch (error) {
    console.error("Google Drive status check failed:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    return res.status(500).json({
      connected: false,
      message: "Could not verify Google Drive connection.",
    });
  }
});

export default router;
