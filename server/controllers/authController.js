import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
import { db } from "../db.js";
import { usersBackup } from "../utils/supabase-cloud-storage-users-backup.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, phoneNumber } = req.body;

    const exists = await db.query(
      `SELECT * FROM users WHERE email=$1 OR phone_number=$2`,
      [email, phoneNumber]
    );

    if (exists.rows.length) {
      return res.status(400).json({ error: "Email or Phone already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (name, email, password, phone_number)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, phone_number, created_at,password`,
      [name, email, hashed, phoneNumber]
    );

    const user = result.rows[0];

    // create custom id → name-serial
    const publicId = `${user.name.toLowerCase().replace(/\s+/g, "")}-${
      user.id
    }`;

    await db.query(`UPDATE users SET public_id=$1 WHERE id=$2`, [
      publicId,
      user.id,
    ]);

    await usersBackup(user);

    // const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET, {
    //   expiresIn: "1h",
    // });

    // res.cookie("token", jwtToken, {
    //   httpOnly: false, // accessible via client-side JS
    //   secure: false, // set to true if using HTTPS
    //   sameSite: "lax", // if frontend is on different origin
    //   maxAge: 60 * 60 * 1000, // 1 hour
    // });

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await db.query(`SELECT * FROM users WHERE email=$1`, [email]);

    if (user.rows.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const jwtToken = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.cookie("token", jwtToken, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: false,
    secure: false,
    sameSite: "lax",
  });

  res.status(200).json({ message: "Logout successful" });
};
