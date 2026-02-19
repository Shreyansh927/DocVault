import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;
  const refreshToken = req.cookies.refreshToken;

  /* ---------- ACCESS TOKEN ---------- */
  if (accessToken) {
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

      const userRes = await db.query(
        `SELECT id, email, auth_uuid FROM users WHERE id = $1`,
        [decoded.id]
      );

      if (!userRes.rows.length) {
        return res.status(401).json({ error: "User not found" });
      }

      req.user = {
        id: userRes.rows[0].id, // INTEGER
        auth_uuid: userRes.rows[0].auth_uuid, // UUID
        email: userRes.rows[0].email,
      };

      return next();
    } catch {
      // expired → try refresh
    }
  }

  /* ---------- REFRESH TOKEN ---------- */
  if (!refreshToken) {
    return res.status(401).json({ error: "Session expired" });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    const tokenRes = await db.query(
      `
      SELECT id, revoked
      FROM refresh_tokens
      WHERE token=$1 AND expires_at > NOW()
      `,
      [refreshToken]
    );

    if (!tokenRes.rows.length || tokenRes.rows[0].revoked) {
      await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [
        decoded.id,
      ]);

      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      return res.status(401).json({ error: "Session invalidated" });
    }

    /* ---------- ROTATE TOKENS ---------- */
    await db.query(`UPDATE refresh_tokens SET revoked=true WHERE id=$1`, [
      tokenRes.rows[0].id,
    ]);

    const newRefreshToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await db.query(
      `
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES ($1,$2,NOW()+INTERVAL '7 days')
      `,
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

    const userRes = await db.query(
      `SELECT id, email, auth_uuid FROM users WHERE id=$1`,
      [decoded.id]
    );

    req.user = {
      id: userRes.rows[0].id,
      auth_uuid: userRes.rows[0].auth_uuid,
      email: userRes.rows[0].email,
    };

    next();
  } catch {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(401).json({ error: "Invalid refresh token" });
  }
};

/* ================= CSRF ================= */
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
