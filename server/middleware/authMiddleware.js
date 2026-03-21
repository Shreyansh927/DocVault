import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: "No token" });
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    const userRes = await db.query(
      `SELECT id, email, auth_uuid FROM users WHERE id=$1`,
      [decoded.id],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = userRes.rows[0];
    next();
  } catch {
    return res.status(401).json({ error: "Token expired" });
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
