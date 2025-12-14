import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const initDB = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone_number TEXT UNIQUE,
      profile_image TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      otp TEXT,
      otp_expiry TIMESTAMP
      );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS folders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      folder_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() 
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS files (
      id SERIAL PRIMARY KEY,
      folder_id INTEGER REFERENCES folders(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      encrypted_name TEXT NOT NULL,
      encrypted_link TEXT NOT NULL,
      file_type TEXT,
      size INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log("PostgreSQL connected & tables initialized");
};
