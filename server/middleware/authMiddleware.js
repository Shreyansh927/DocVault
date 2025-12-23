import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  /* ---------- ACCESS TOKEN ---------- */
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      req.user = { id: decoded.id, email: decoded.email };
      return next();
    } catch (err) {
      // token expired → try refresh token
    }
  }

  /* ---------- REFRESH TOKEN ---------- */
  if (!refreshToken) {
    return res.status(401).json({ error: "Session expired" });
  }

  const tokenRes = await db.query(
    `SELECT 1 FROM refresh_tokens WHERE token=$1`,
    [refreshToken]
  );

  if (!tokenRes.rows.length) {
    return res.status(401).json({ error: "Token revoked" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // rotate refresh token
    await db.query(`DELETE FROM refresh_tokens WHERE token=$1`, [refreshToken]);

    const newRefreshToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1,$2,NOW() + INTERVAL '7 days')`,
      [decoded.id, newRefreshToken]
    );

    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", newAccessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
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
