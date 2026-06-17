
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import { db } from "../db.js";
import axios from "axios";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLoginAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({
        error: "Google credential is required",
      });
    }

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(403).json({
        error: "Google email not verified",
      });
    }

    /*  FIND USER-- */

    let userRes = await db.query(`SELECT * FROM users WHERE google_id = $1`, [
      googleId,
    ]);

    let user;

    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
    } else {
      /* ---- LINK EXISTING EMAIL  */

      userRes = await db.query(`SELECT * FROM users WHERE email = $1`, [email]);

      if (userRes.rows.length > 0) {
        const updated = await db.query(
          `
          UPDATE users
          SET google_id = $1,
              profile_image = COALESCE(profile_image, $2)
          WHERE id = $3
          RETURNING *
          `,
          [googleId, picture, userRes.rows[0].id],
        );

        user = updated.rows[0];
      } else {
        /* ---- CREATE USER  */

        const publicId = `${name}_${crypto.randomUUID()}`;

        const inserted = await db.query(
          `
          INSERT INTO users
          (
            google_id,
            name,
            email,
            profile_image,
            public_id
          )
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [googleId, name, email, picture, publicId],
        );

        user = inserted.rows[0];
      }
    }

    /* -- SESSION -- */

    const parser = new UAParser(req.headers["user-agent"]);

    const deviceType = parser.getDevice().type || "desktop";

    const browser = parser.getBrowser().name || "Unknown Browser";

    const os = parser.getOS().name || "Unknown OS";

    const deviceName = `${browser} on ${os} (${deviceType})`;

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

    let ipLocation = "Unknown";

    try {
      const geo = await axios.get(`https://ipapi.co/${ip}/json/`);

      ipLocation = `${geo.data.city}, ${geo.data.country_name}`;
    } catch {
      console.log("Could not determine location");
    }

    const sessionUuid = crypto.randomUUID();

    const jwtPayload = {
      id: user.id,
      email: user.email,
      session_uuid: sessionUuid,
      tokenVersion: user.token_version,
    };

    const accessToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });

    const refreshToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await db.query(
      `
      INSERT INTO refresh_tokens
      (
        user_id,
        token,
        session_uuid,
        expires_at,
        user_agent,
        ip_address,
        ip_location
      )
      VALUES
      (
        $1,
        $2,
        $3,
        NOW() + INTERVAL '7 days',
        $4,
        $5,
        $6
      )
      `,
      [user.id, refreshToken, sessionUuid, deviceName, ip, ipLocation],
    );

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 15 * 60 * 1000,
      path: "/",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return res.status(200).json({
      message: "Google login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Google authentication failed",
    });
  }
};
