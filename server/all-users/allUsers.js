import { db } from "../db.js";

export const allUsers = async (req, res) => {
  try {
    const result = await db.query(`SELECT public_id, name, email FROM users`);

    res.status(200).json({
      otherUsers: result.rows,
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
