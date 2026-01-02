import { db } from "../db.js";
import { redis } from "../redis.js";
import { io } from "../server.js";

/* ================= SEND FRIEND REQUEST ================= */
export const sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = Number(req.body.receiverId);

    if (!receiverId || senderId === receiverId) {
      return res.status(400).json({ error: "Invalid request" });
    }

    await db.query(
      `
      INSERT INTO connections (sender_id, receiver_id)
      VALUES ($1,$2)
      ON CONFLICT DO NOTHING
      `,
      [senderId, receiverId]
    );

    const senderRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [senderId]
    );

    const sender = senderRes.rows[0];

    // invalidate receiver notification cache
    await redis?.del(`notifications:user:${receiverId}`);

    const notifRes = await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST','PENDING')
      RETURNING id, created_at
      `,
      [receiverId, senderId, sender.name, sender.profile_image]
    );

    io.to(String(receiverId)).emit("friend-request", {
      id: notifRes.rows[0].id,
      senderId,
      name: sender.name,
      profile_image: sender.profile_image,
      status: "PENDING",
      created_at: notifRes.rows[0].created_at,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("SEND REQUEST ERROR:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= ACCEPT FRIEND REQUEST ================= */
export const acceptRequest = async (req, res) => {
  const receiverId = req.user.id;
  const senderId = Number(req.body.senderId);

  if (!senderId) {
    return res.status(400).json({ error: "Invalid senderId" });
  }

  try {
    await db.query("BEGIN");

    await db.query(
      `
      UPDATE notifications
      SET status='ACCEPTED'
      WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'
      `,
      [receiverId, senderId]
    );

    const receiverRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [receiverId]
    );

    const receiver = receiverRes.rows[0];

    const senderNotif = await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_ACCEPTED','ACCEPTED')
      RETURNING id, created_at
      `,
      [senderId, receiverId, receiver.name, receiver.profile_image]
    );

    await db.query(
      `
      INSERT INTO friends (user_id, friend_id)
      VALUES ($1,$2), ($2,$1)
      ON CONFLICT DO NOTHING
      `,
      [receiverId, senderId]
    );

    await db.query("COMMIT");

    // await redis?.del(`notifications:user:${senderId}`);
    // await redis?.del(`connections:${senderId}`);
    // await redis?.del(`connections:${receiverId}`);

    io.to(String(senderId)).emit("friend-request-response", {
      id: senderNotif.rows[0].id,
      type: "FRIEND_REQUEST_ACCEPTED",
      senderId: receiverId,
      name: receiver.name,
      profile_image: receiver.profile_image,
      created_at: senderNotif.rows[0].created_at,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("ACCEPT ERROR:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= DENY FRIEND REQUEST ================= */
export const denyRequest = async (req, res) => {
  const receiverId = req.user.id;
  const senderId = Number(req.body.senderId);

  if (!senderId) {
    return res.status(400).json({ error: "Invalid senderId" });
  }

  try {
    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'
      `,
      [receiverId, senderId]
    );

    const receiverRes = await db.query(
      `SELECT name, profile_image FROM users WHERE id=$1`,
      [receiverId]
    );

    const senderNotif = await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_REJECTED','REJECTED')
      RETURNING id, created_at
      `,
      [
        senderId,
        receiverId,
        receiverRes.rows[0].name,
        receiverRes.rows[0].profile_image,
      ]
    );

    await redis?.del(`notifications:user:${senderId}`);

    io.to(String(senderId)).emit("friend-request-response", {
      id: senderNotif.rows[0].id,
      type: "FRIEND_REQUEST_REJECTED",
      senderId: receiverId,
      created_at: senderNotif.rows[0].created_at,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("DENY ERROR:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const removeFriendId = req.body.removeFriend;
    const currentUserId = req.user.id;

    await db.query(`DELETE FROM friends WHERE user_id=$1 AND friend_id=$2`, [
      currentUserId,
      removeFriendId,
    ]);

    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id=$1 AND sender_id=$2
      `,
      [removeFriendId, currentUserId]
    );

    return res
      .status(200)
      .json({ message: "friend removed from connection list successfully" });
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: "error removing friend" });
  }
};

/* ================= GET CONNECTIONS ================= */
export const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    // const cacheKey = `connections:${userId}`;

    // if (redis) {
    //   const cached = await redis.get(cacheKey);
    //   if (cached) {
    //     return res.json({
    //       connections: JSON.parse(cached),
    //       source: "cache",
    //     });
    //   }
    // }

    const result = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.profile_image,
        f.show_folders
      FROM friends f
      JOIN users u ON u.id = f.friend_id
      WHERE f.user_id = $1
      `,
      [userId]
    );

    // await redis?.setEx(cacheKey, 300, JSON.stringify(result.rows));

    return res.json({
      connections: result.rows,
      source: "db",
    });
  } catch (err) {
    console.error("GET CONNECTIONS ERROR:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= TOGGLE FOLDER VISIBILITY ================= */
export const allowShowFolder = async (req, res) => {
  const ownerId = req.user.id;
  const friendId = Number(req.body.connectionId);

  await db.query(
    `
    UPDATE friends
    SET show_folders = TRUE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [friendId, ownerId]
  );
  await db.query(
    `
    UPDATE friends
    SET show_folders = TRUE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [ownerId, friendId]
  );

  return res.json({ success: true });
};

export const restrictShowFolder = async (req, res) => {
  const ownerId = req.user.id;
  const friendId = Number(req.body.connectionId);

  await db.query(
    `
    UPDATE friends
    SET show_folders = FALSE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [friendId, ownerId]
  );
  await db.query(
    `
    UPDATE friends
    SET show_folders = FALSE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [ownerId, friendId]
  );

  return res.json({ success: true });
};

/* ================= GET SHARED FOLDERS ================= */
export const getSharedFoldersPractice = async (req, res) => {
  try {
    const ownerId = Number(req.params.userId);
    const viewerId = req.user.id;

    const result = await db.query(
      `
      SELECT fo.*
      FROM folders fo
      JOIN friends fr ON fr.user_id = fo.user_id
      WHERE
        fo.user_id = $1
        AND fr.friend_id = $2
        AND fr.show_folders = true
        AND fo.category = 'PUBLIC'
      `,
      [ownerId, viewerId]
    );

    res.json({ sharedFolders: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= GET SHARED FILES ================= */
export const getSharedFiles = async (req, res) => {
  try {
    const ownerId = Number(req.params.friendId);
    const folderId = Number(req.params.folderId);
    const viewerId = req.user.id;

    const result = await db.query(
      `
      SELECT f.*
      FROM files f
      JOIN folders fo ON fo.id = f.folder_id
      JOIN friends fr ON fr.user_id = fo.user_id
      WHERE
        fo.id = $1
        AND fo.user_id = $2
        AND fr.friend_id = $3
        AND fr.show_folders = true
        AND f.is_deleted = false
      `,
      [folderId, ownerId, viewerId]
    );

    res.json({ sharedFiles: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= GET SHARED FILE VIEW ================= */
export const getSharedFileView = async (req, res) => {
  try {
    const ownerId = Number(req.params.friendId);
    const folderId = Number(req.params.folderId);
    const fileId = Number(req.params.fileId);
    const viewerId = req.user.id;

    const result = await db.query(
      `
      SELECT f.*
      FROM files f
      JOIN folders fo ON fo.id = f.folder_id
      JOIN friends fr ON fr.user_id = fo.user_id
      WHERE
        f.id = $1
        AND f.folder_id = $2
        AND fo.user_id = $3
        AND fr.friend_id = $4
        AND fr.show_folders = true
        AND f.is_deleted = false
      `,
      [fileId, folderId, ownerId, viewerId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "File not found or access denied" });
    }

    res.json({ SharefileData: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkFolderAccess = async (req, res, next) => {
  const ownerId = Number(req.params.userId) || Number(req.params.friendId);

  const viewerId = req.user.id;

  const result = await db.query(
    `
    SELECT 1
    FROM friends
    WHERE user_id = $1
      AND friend_id = $2
      AND show_folders = TRUE
    `,
    [ownerId, viewerId]
  );

  if (!result.rows.length) {
    return res.status(403).json({
      error: "Access revoked or not permitted",
    });
  }

  next();
};
