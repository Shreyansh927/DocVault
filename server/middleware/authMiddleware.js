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
      `SELECT id, email, token_version FROM users WHERE id=$1`,
      [decoded.id],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    if (decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ error: "Session expired" });
    }

    req.user = user;

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "ACCESS_TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid token" });
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
