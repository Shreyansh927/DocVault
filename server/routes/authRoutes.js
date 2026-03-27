import {
  signup,
  login,
  logout,
  getAllCurrentSessions,
} from "../controllers/authController.js";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", authMiddleware, logout);
// authRoutes.js
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,

    email: req.user.email,
  });
});
router.get("/current-sessions", authMiddleware, getAllCurrentSessions);
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token" });
    }

    // verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // check DB
    const tokenRes = await db.query(
      `SELECT * FROM refresh_tokens 
       WHERE token=$1 AND expires_at > NOW()`,
      [refreshToken],
    );

    if (!tokenRes.rows.length || tokenRes.rows[0].revoked) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // get user (for token_version check)
    const userRes = await db.query(
      `SELECT id, email, token_version FROM users WHERE id=$1`,
      [decoded.id],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    //TOKEN VERSION CHECK (VERY IMPORTANT)
    if (decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ error: "Session expired" });
    }

    //create new access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        tokenVersion: user.token_version,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    return res.json({ message: "Token refreshed" });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Invalid refresh token" });
  }
});

export default router;
