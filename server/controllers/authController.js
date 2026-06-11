import bcrypt from "bcrypt";
import crypto from "crypto";
import { db } from "../db.js";
import jwt from "jsonwebtoken";
import { supabaseAdmin } from "../supabaseAdmin.js";
import axios from "axios";
import { usersBackup } from "../utils/supabase-cloud-storage-users-backup.js";
import { profile } from "console";
import { UAParser } from "ua-parser-js";
import { stat } from "fs";

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

const ipLocation = async (ip) => {
  try {
    if (!ip) return "Unknown";

    const geoRes = await axios.get(`https://ipapi.co/${ip}/json/`);

    console.log("Geo API:", geoRes.data);

    const city = geoRes.data.city || "Unknown city";
    const country = geoRes.data.country_name || "Unknown country";

    return `${city}, ${country}`;
  } catch (err) {
    console.log("IP location error:", err.message);
    return "Unknown location";
  }
};

/* -- LOGIN ----- */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.headers["user-agent"];
    const parser = new UAParser(userAgent);
    const deviceType = parser.getDevice().type;
    const browser = parser.getBrowser().name;
    const os = parser.getOS().name;
    const device_name = `${browser} on ${os} (${deviceType})`;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    const ip_location = await ipLocation(ip);
    const userRes = await db.query(
      `SELECT id, auth_uuid, name, email, password_hash, profile_image, locked_until, token_version
   FROM users
   WHERE email=$1`,
      [email],
    );

    if (!userRes.rows.length) {
      return res.status(401).json({ error: "user not found" });
    }

    const user = userRes.rows[0];
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    console.log("User from DB:", user);

    if (
      user.locked_until &&
      new Date(user.locked_until).getTime() > Date.now()
    ) {
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

    const payload = {
      id: user.id,
      auth_uuid: user.auth_uuid,

      email: user.email,
      tokenVersion: user.token_version,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing!");
      return res.status(500).json({ error: "Server misconfigured" });
    }
    const existingSession = await db.query(
      `SELECT id FROM refresh_tokens 
   WHERE user_id = $1 AND user_agent = $2 AND ip_address = $3`,
      [user.id, device_name, ip],
    );
    if (existingSession.rows.length > 0) {
      await db.query(
        `UPDATE refresh_tokens 
     SET token = $1, expires_at = NOW() + INTERVAL '7 days'
     WHERE id = $2`,
        [refreshToken, existingSession.rows[0].id],
      );
    } else {
      await db.query(
        `INSERT INTO refresh_tokens 
     (user_id, token, expires_at, user_agent, ip_address, ip_location)
     VALUES ($1,$2,NOW() + INTERVAL '7 days',$3,$4,$5)`,
        [user.id, refreshToken, device_name, ip, ip_location],
      );
    }

    const isProd = process.env.NODE_ENV === "production";

    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    console.log("BODY:", req.body);
    console.log("USER:", user);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("Cookies:", req.cookies);

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
  try {
    const userId = req.user.id;

    await db.query(
      `UPDATE users SET token_version = token_version + 1 WHERE id=$1`,
      [userId],
    );

    await db.query(`DELETE FROM refresh_tokens WHERE user_id=$1`, [userId]);

    const isProd = process.env.NODE_ENV === "production";

    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
    });

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Logout failed" });
  }
};

export const getAllCurrentSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rows } = await db.query(
      `SELECT id as "refresh_token_id", user_agent as "userAgent", ip_address as "deviceIpAddress", ip_location as "deviceIpLocation" FROM refresh_tokens WHERE user_id = $1 and id <> $2`,
      [userId],
    );
    return res.status(200).json({ allExistingSession: rows });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err });
  }
};

export const logoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.body;
    await db.query(
      `DELETE FROM refresh_tokens WHERE user_id = $1 AND id = $2`,
      [userId, sessionId],
    );

    return res
      .status(200)
      .json({ message: `session id ${sessionId} deleted successfully` });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: err });
  }
};
