import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";
import { usersBackup } from "../utils/supabase-cloud-storage-users-backup.js";

/* ---------------- SIGNUP ---------------- */

export const signup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exists = await db.query(
      `SELECT * FROM users WHERE email=$1 OR phone_number=$2`,
      [email, phoneNumber || null]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: "Email or phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const publicId = crypto.randomUUID();
    const phone = phoneNumber?.trim() || null;

    const newUser = await db.query(
      `INSERT INTO users 
       (name, email, password_hash, phone_number, public_id)
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, name, email, phone_number, public_id, created_at`,
      [name, email, hashedPassword, phone, publicId]
    );
    const user = newUser.rows[0];

    usersBackup(user);

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("SIGNUP ERROR 👇");
    console.error(err.stack || err);
    return res.status(500).json({ error: err.message });
  }
};

/* ---------------- LOGIN ---------------- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await db.query(
      `SELECT id, name, email, password_hash FROM users WHERE email=$1`,
      [email]
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userRes.rows[0];

    if (user.locked_until && user.locked_until > new Date()) {
      return res
        .status(403)
        .json({ error: "Account blocked. try again later" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await db.query(
        `UPDATE users SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END WHERE id =$1`,
        [user.id]
      );

      return res.status(401).json({ error: "Invalid email or password" });
    }

    await db.query(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id =$1`,
      [user.id]
    );

    const payload = { id: user.id, email: user.email };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await db.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1,$2,NOW() + INTERVAL '7 days')`,
      [user.id, refreshToken]
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

/* ---------------- LOGOUT ---------------- */
export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await db.query(`DELETE FROM refresh_tokens WHERE token=$1`, [refreshToken]);
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.clearCookie("csrfToken");

  res.json({ message: "Logged out successfully" });
};
