import jwt from "jsonwebtoken";
import { db } from "../db.js";

export const authMiddleware = async (req, res, next) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ error: "No token" });
  }


  try {
    // console.log("Access Token:", accessToken);
    console.log("Auth middleware hit:", req.method, req.originalUrl);
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    const sessionUuidFromDb = await db.query(
      `
      SELECT session_uuid FROM refresh_tokens WHERE user_id = $1 AND session_uuid = $2
    `,
      [decoded.id, decoded.session_uuid],
    );

    const userRes = await db.query(
      `SELECT id, auth_uuid, email, token_version FROM users WHERE id=$1`,
      [decoded.id],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userRes.rows[0];

    // if (decoded.tokenVersion !== user.token_version || !sessionUuidFromDb.rows.length) {
    //   return res.status(401).json({ error: "Session expired" });
    // }

    req.user = user;

    console.log("Cookies:", req.cookies);
    console.log("User:", req.user);

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


