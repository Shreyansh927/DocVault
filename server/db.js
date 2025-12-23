import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const initDB = async () => {
  /* ---------- USERS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      profile_image TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      otp TEXT,
      otp_expiry TIMESTAMP
    );
  `);

  /* ---------- FOLDERS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      folder_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  /* ---------- FILES ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      encrypted_name TEXT NOT NULL,
      encrypted_link TEXT NOT NULL,
      file_type TEXT,
      size INTEGER,
      storage TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  /* ---------- REFRESH TOKENS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token
    ON refresh_tokens(token);
  `);

  /* ---------- CONNECTION REQUESTS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS connections (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(sender_id, receiver_id)
    );
  `);

  /* ---------- FRIENDS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS friends (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_id)
    );
  `);

  /* ---------- NOTIFICATIONS ---------- */
  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      sender_name TEXT NOT NULL,
      sender_profile_image TEXT,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      seen BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, sender_id, type)
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id
    ON notifications(user_id);
  `);

  console.log("✅ PostgreSQL connected & tables initialized");
};
