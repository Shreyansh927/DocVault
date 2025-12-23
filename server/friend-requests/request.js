import { db } from "../db.js";
import { io } from "../server.js";

/* ================= SEND REQUEST ================= */
export const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = Number(req.body.receiverId);

    if (!receiverId || senderId === receiverId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    await db.query(
      `INSERT INTO connections (sender_id, receiver_id)
       VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [senderId, receiverId]
    );

    const senderRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [senderId]
    );
    const sender = senderRes.rows[0];

    const notifRes = await db.query(
      `INSERT INTO notifications
       (user_id, sender_id, sender_name, sender_profile_image, type, status)
       VALUES ($1,$2,$3,$4,'FRIEND_REQUEST','PENDING')
       RETURNING *`,
      [receiverId, senderId, sender.name, sender.profile_image]
    );

    const n = notifRes.rows[0];

    io.to(String(receiverId)).emit("friend-request", {
      id: n.id,
      senderId,
      name: sender.name,
      profile_image: sender.profile_image,
      status: n.status,
      created_at: n.created_at,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SEND REQUEST ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= ACCEPT REQUEST ================= */
export const acceptRequest = async (req, res) => {
  const receiverId = req.user.id;
  const senderId = Number(req.body.senderId);

  if (!senderId) return res.status(400).json({ error: "Invalid senderId" });

  try {
    await db.query("BEGIN");

    await db.query(
      `UPDATE notifications
       SET status='ACCEPTED'
       WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'`,
      [receiverId, senderId]
    );

    const receiverRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [receiverId]
    );
    const receiver = receiverRes.rows[0];

    const senderNotif = await db.query(
      `INSERT INTO notifications
       (user_id, sender_id, sender_name, sender_profile_image, type, status)
       VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_ACCEPTED','ACCEPTED')
       RETURNING *`,
      [senderId, receiverId, receiver.name, receiver.profile_image]
    );

    await db.query(
      `INSERT INTO friends (user_id, friend_id)
       VALUES ($1,$2), ($2,$1)
       ON CONFLICT DO NOTHING`,
      [receiverId, senderId]
    );

    await db.query("COMMIT");

    io.to(String(senderId)).emit("friend-request-response", {
      notification: {
        id: senderNotif.rows[0].id,
        type: "FRIEND_REQUEST_ACCEPTED",
        status: "ACCEPTED",
        senderId: receiverId,
        name: receiver.name,
        profile_image: receiver.profile_image,
        created_at: senderNotif.rows[0].created_at,
      },
    });

    res.json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("ACCEPT ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= DENY REQUEST ================= */
export const denyRequest = async (req, res) => {
  const receiverId = req.user.id;
  const senderId = Number(req.body.senderId);

  if (!senderId) return res.status(400).json({ error: "Invalid senderId" });

  try {
    await db.query(
      `DELETE FROM notifications
       WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'`,
      [receiverId, senderId]
    );

    const receiverRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [receiverId]
    );
    const receiver = receiverRes.rows[0];

    const senderNotif = await db.query(
      `INSERT INTO notifications
       (user_id, sender_id, sender_name, sender_profile_image, type, status)
       VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_REJECTED','REJECTED')
       RETURNING *`,
      [senderId, receiverId, receiver.name, receiver.profile_image]
    );

    io.to(String(senderId)).emit("friend-request-response", {
      notification: senderNotif.rows[0],
    });

    res.json({ success: true });
  } catch (err) {
    console.error("DENY ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= GET CONNECTIONS ================= */
export const getConnections = async (req, res) => {
  const userId = req.user.id;

  const result = await db.query(
    `
    SELECT *
    FROM friends f
    JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = $1
    `,
    [userId]
  );

  res.json({ connections: result.rows });
};

export const allowShowFolder = async (req, res) => {
  const userId = req.user.id;
  const friend_id = Number(req.body.connectionId);

  // await db.query(
  //   `UPDATE friends
  //   SET show_folders = TRUE
  //   WHERE user_id = $1 AND friend_id = $2`,
  //   [userId, friend_id]
  // );

  await db.query(
    `UPDATE friends 
    SET show_folders = TRUE 
    WHERE user_id = $1 AND friend_id = $2`,
    [friend_id, userId]
  );
  res.json({ success: true });
};

export const restrictShowFolder = async (req, res) => {
  const userId = req.user.id;
  const friend_id = Number(req.body.connectionId);

  // await db.query(
  //   `UPDATE friends
  //   SET show_folders = FALSE
  //   WHERE user_id = $1 AND friend_id = $2`,
  //   [userId, friend_id]
  // );

  await db.query(
    `UPDATE friends 
    SET show_folders = FALSE 
    WHERE user_id = $1 AND friend_id = $2`,
    [friend_id, userId]
  );
  res.json({ success: true });
};

/* ================= GET SHARED FOLDERS ================= */
export const getSharedFoldersPractice = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const ownerId = Number(req.params.userId);

    if (!ownerId) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    // Check friendship
    const friendCheck = await db.query(
      `SELECT 1 FROM friends WHERE user_id=$1 AND friend_id=$2`,
      [currentUserId, ownerId]
    );

    if (!friendCheck.rows.length) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // 📁 Fetch folders of that friend
    const folders = await db.query(
      `SELECT * FROM folders WHERE user_id=$1 AND is_public=false`,
      [ownerId]
    );

    res.json({ sharedFolders: folders.rows });
  } catch (err) {
    console.error("GET SHARED FOLDERS ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSharedFiles = async (req, res) => {
  try {
    const friendId = Number(req.params.friendId);
    const folderId = Number(req.params.folderId);

    if (!friendId || !folderId) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    const files = await db.query(
      `SELECT * FROM files JOIN folders ON folders.id = files.folder_id WHERE  folders.id = $1 AND files.is_deleted = false AND folders.user_id = $2`,
      [folderId, friendId]
    );

    res.json({ sharedFiles: files.rows });
  } catch (err) {
    console.error("GET SHARED FILES ERROR:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
