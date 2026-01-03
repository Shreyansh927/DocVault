import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  /* ================= ACCESS TOKEN ================= */
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email };
      return next();
    } catch {
      // expired → try refresh token
    }
  }

  /* == NO REFRESH TOKEN = */
  if (!refreshToken) {
    return res.status(401).json({ error: "Session expired" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    /* ================= CHECK TOKEN IN DB ================= */
    const tokenRes = await db.query(
      `
      SELECT id, user_id, revoked
      FROM refresh_tokens
      WHERE token = $1 AND expires_at > NOW()
      `,
      [refreshToken]
    );

    //  Token not found → reuse detected
    if (!tokenRes.rows.length) {
      // revoke ALL sessions of this user
      await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [
        decoded.id,
      ]);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.status(401).json({
        error: "Refresh token reuse detected. All sessions revoked.",
      });
    }

    const storedToken = tokenRes.rows[0];

    //  Token already revoked → reuse attack
    if (storedToken.revoked) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [
        decoded.id,
      ]);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.status(401).json({
        error: "Session compromised. Please login again.",
      });
    }

    /* ================= ROTATE TOKENS ================= */

    // 1️ Revoke old refresh token
    await db.query(`UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1`, [
      storedToken.id,
    ]);

    // 2️ Create new refresh token
    const newRefreshToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await db.query(
      `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '7 days')
      `,
      [decoded.id, newRefreshToken]
    );

    // 3️ Create new access token
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

/* ---------- CSRF ---------- */
export const csrfMiddleware = (req, res, next) => {
  if (req.method === "GET") return next();

  if (
    !req.cookies.csrfToken ||
    req.headers["x-csrf-token"] !== req.cookies.csrfToken
  ) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }

  next();
};
