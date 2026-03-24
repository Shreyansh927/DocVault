import { signup, login, logout } from "../controllers/authController.js";
import jwt from "jsonwebtoken";
import { db } from "../db.js";

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout",authMiddleware, logout);
// authRoutes.js
router.get("/me", authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,

    email: req.user.email,
  });
});
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: "No refresh token" });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const tokenRes = await db.query(
      `SELECT * FROM refresh_tokens WHERE token=$1 AND expires_at > NOW()`,
      [refreshToken],
    );

    if (!tokenRes.rows.length || tokenRes.rows[0].revoked) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
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
