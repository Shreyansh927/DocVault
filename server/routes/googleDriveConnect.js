// GET /api/google-drive/connect
import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { oauth2Client } from "../config/googleDrive.js";
import { db } from "../db.js";
import { auth } from "googleapis/build/src/apis/abusiveexperiencereport/index.js";
import { getGoogleDriveFiles, importGoogleDriveFiles } from "../controllers/googleDrive.js";

const googleDriveConnectRouter = express.Router();

googleDriveConnectRouter.get("/connect", authMiddleware, (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],

    state: req.user.id.toString(),
  });

  res.redirect(authUrl);
});
googleDriveConnectRouter.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    const userId = Number(state);

    const { tokens } = await oauth2Client.getToken(code);

    console.log("TOKENS:", tokens);

    if (!tokens.refresh_token) {
      return res.status(400).json({
        error: "No refresh token received from Google",
      });
    }

    await db.query(
      `
      INSERT INTO google_drive_accounts (
        user_id,
        refresh_token
      )
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET
        refresh_token = EXCLUDED.refresh_token,
        connected_at = NOW()
      `,
      [userId, tokens.refresh_token],
    );

    res.redirect("http://localhost:5173/google-drive");
  } catch (error) {
    console.error("GOOGLE ERROR:", error);

    res.status(500).json({
      message: error.message,
      error: error.response?.data || error,
    });
  }
});

googleDriveConnectRouter.get("/files", authMiddleware, getGoogleDriveFiles);

googleDriveConnectRouter.post(
  "/import",
  authMiddleware,
  importGoogleDriveFiles,
);

googleDriveConnectRouter.get("/status", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 1
   FROM google_drive_accounts
   WHERE user_id = $1`,
      [req.user.id],
    );
    console.log(result.rows.length);

    res.json({
      connected: result.rows.length > 0,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err });
  }
});

export default googleDriveConnectRouter;
