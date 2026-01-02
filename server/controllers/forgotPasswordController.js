import dotenv from "dotenv";
dotenv.config();
import { db } from "../db.js";
import { sendEmail } from "../utils/send-email.js";
import bcrypt from "bcrypt";

export const forGotPAssword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await db.query(`SELECT id FROM users WHERE email = $1`, [
      email,
    ]);

    if (!user.rows.length) {
      return res.status(400).json({ error: "Email not found" });
    }

    const resetOtp = Math.floor(1000 + Math.random() * 9000).toString();

    await db.query(
      `
      UPDATE users
      SET otp = $1,
          otp_expiry = NOW() + INTERVAL '15 minutes'
      WHERE email = $2
      `,
      [resetOtp, email]
    );

    await sendEmail({
      to: email,
      subject: "Password Reset OTP",
      html: `<p>Your OTP is <b>${resetOtp}</b>. It expires in 15 minutes.</p>`,
    });

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const result = await db.query(
      `
      SELECT id
      FROM users
      WHERE email = $1
        AND otp = $2
        AND otp_expiry > NOW()
      `,
      [email, otp.toString()]
    );

    if (!result.rows.length) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // clear OTP
    await db.query(
      `
      UPDATE users
      SET otp = NULL,
          otp_expiry = NULL
      WHERE email = $1
      `,
      [email]
    );

    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OTP verification failed" });
  }
};

export const setNewPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "missing credentials" });
    }

    const user = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const newHashedPassword = await bcrypt.hash(password, 10);

    await db.query(`UPDATE users SET password_hash=$1 WHERE email=$2`, [
      newHashedPassword,
      email,
    ]);

    return res.status(200).json({ message: "Password updates successfully" });
  } catch (err) {
    console.log(err);
    return res.status(401).json({ error: err });
  }
};
