import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../supabaseAdmin.js";
import { usersBackup } from "../utils/supabase-cloud-storage-users-backup.js";
import { profile } from "console";

export const signup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    /* ---------- CHECK DUPLICATES ---------- */
    const exists = await db.query(
      `SELECT 1 FROM users WHERE email=$1 OR phone_number=$2`,
      [email, phoneNumber],
    );
    if (exists.rows.length) {
      return res.status(400).json({ error: "Email or phone already exists" });
    }

    /* ---------- CREATE SUPABASE AUTH USER ---------- */
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) return res.status(400).json({ error: error.message });

    const authUuid = data.user.id;

    /* ---------- CREATE APP USER ---------- */
    const hashedPassword = await bcrypt.hash(password, 10);
    const publicId = `${name}_${crypto.randomUUID()}`;

    const result = await db.query(
      `
      INSERT INTO users
      (auth_uuid, name, email, password_hash, phone_number, public_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id, auth_uuid, name, email, phone_number, public_id, created_at
      `,
      [authUuid, name, email, hashedPassword, phoneNumber, publicId],
    );

    const user = result.rows[0];

    await usersBackup(user);

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

/* -- LOGIN ----- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userRes = await db.query(
      `SELECT id, name, email, password_hash, profile_image FROM users WHERE email=$1`,
      [email],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "user not found" });
    }

    const user = userRes.rows[0];

    if (user.locked_until > new Date()) {
      return res
        .status(403)
        .json({ error: "Account blocked. try again later" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      await db.query(
        `UPDATE users SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END WHERE id =$1`,
        [user.id],
      );

      return res.status(401).json({ error: "Invalid email or password" });
    }

    await db.query(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id =$1`,
      [user.id],
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
      [user.id, refreshToken],
    );

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

/* -- LOGOUT -- */
export const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const accessToken = req.cookies.accessToken;

  if (refreshToken || accessToken) {
    await db.query(`DELETE FROM refresh_tokens WHERE token=$1`, [refreshToken]);
    await db.query(`DELETE FROM refresh_tokens WHERE token=$1`, [accessToken]);
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  res.clearCookie("csrfToken");

  res.json({ message: "Logged out successfully" });
};
