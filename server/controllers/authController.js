import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { db } from "../db.js";

/* ---------------- SIGNUP ---------------- */
export const signup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    const exists = await db.query(
      `SELECT 1 FROM users WHERE email=$1 OR phone_number=$2`,
      [email, phoneNumber]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: "Email or phone already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password, phone_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email`,
      [name, email, hashedPassword, phoneNumber]
    );

    const user = result.rows[0];
    const publicId = `${user.name.toLowerCase().replace(/\s+/g, "")}-${
      user.id
    }`;

    await db.query(`UPDATE users SET public_id=$1 WHERE id=$2`, [
      publicId,
      user.id,
    ]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

/* ---------------- LOGIN ---------------- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await db.query(
      `SELECT id, name, email, password FROM users WHERE email=$1`,
      [email]
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = userRes.rows[0];

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

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

    res.cookie("csrfToken", crypto.randomUUID(), {
      httpOnly: false,
      sameSite: "lax",
    });

    // ✅ THIS FIXES YOUR BUG
    return res.status(200).json({
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
