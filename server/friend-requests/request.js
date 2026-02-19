import { db } from "../db.js";

/* ================= SEND REQUEST ================= */
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
      [senderId, receiverId],
    );

    await db.query(
      `INSERT INTO chats (user1_id, user2_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [senderId, receiverId],
    );

    const sender = (
      await db.query(`SELECT name, profile_image FROM users WHERE id=$1`, [
        senderId,
      ])
    ).rows[0];

    const receiverAuthUUID = (
      await db.query(`SELECT auth_uuid FROM users WHERE id=$1`, [receiverId])
    ).rows[0].auth_uuid;

    await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST','PENDING')
      ON CONFLICT DO NOTHING
      `,
      [receiverAuthUUID, senderId, sender.name, sender.profile_image],
    );
    console.log("REQ.USER:", req.user);
    res.json({ success: true });
  } catch (err) {
    console.error("SEND REQUEST ERROR:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/* ================= ACCEPT FRIEND REQUEST ================= */
export const acceptRequest = async (req, res) => {
  const receiverId = req.user.id; // INTEGER
  const senderId = Number(req.body.senderId);

  try {
    await db.query("BEGIN");

    /* ---------- FETCH AUTH UUIDS ---------- */
    const receiver = await db.query(
      `SELECT auth_uuid, name, profile_image FROM users WHERE id=$1`,
      [receiverId],
    );

    const sender = await db.query(`SELECT auth_uuid FROM users WHERE id=$1`, [
      senderId,
    ]);

    /* ---------- UPDATE RECEIVER NOTIFICATION ---------- */
    await db.query(
      `
      UPDATE notifications
      SET status='ACCEPTED'
      WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'
      `,
      [receiver.rows[0].auth_uuid, senderId],
    );

    /* ---------- INSERT SENDER NOTIFICATION ---------- */
    await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_ACCEPTED','ACCEPTED')
      `,
      [
        sender.rows[0].auth_uuid, // 🔥 UUID
        receiverId,
        receiver.rows[0].name,
        receiver.rows[0].profile_image,
      ],
    );

    /* ---------- FRIEND RELATION ---------- */
    await db.query(
      `
      INSERT INTO friends (user_id, friend_id)
      VALUES ($1,$2), ($2,$1)
      ON CONFLICT DO NOTHING
      `,
      [receiverId, senderId],
    );

    await db.query("COMMIT");

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

  try {
    const receiver = await db.query(
      `SELECT auth_uuid, name, profile_image FROM users WHERE id=$1`,
      [receiverId],
    );

    const sender = await db.query(`SELECT auth_uuid FROM users WHERE id=$1`, [
      senderId,
    ]);

    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id=$1 AND sender_id=$2 AND type='FRIEND_REQUEST'
      `,
      [receiver.rows[0].auth_uuid, senderId],
    );

    await db.query(
      `
      INSERT INTO notifications
      (user_id, sender_id, sender_name, sender_profile_image, type, status)
      VALUES ($1,$2,$3,$4,'FRIEND_REQUEST_REJECTED','REJECTED')
      `,
      [
        sender.rows[0].auth_uuid, // 🔥 UUID
        receiverId,
        receiver.rows[0].name,
        receiver.rows[0].profile_image,
      ],
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("DENY ERROR:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const removeFriendId = Number(req.body.removeFriend);
    const currentUserId = Number(req.user.id);

    await db.query(`DELETE FROM friends WHERE user_id=$1 AND friend_id=$2`, [
      currentUserId,
      removeFriendId,
    ]);

    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id=$1 AND sender_id=$2
      `,
      [removeFriendId, currentUserId],
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
        f.show_folders, 
        c.id as connection_id
      FROM connections c
      JOIN users u ON (u.id = c.sender_id AND c.receiver_id = $1)
                   OR (u.id = c.receiver_id AND c.sender_id = $1)
      JOIN friends f ON f.user_id = u.id AND f.friend_id = $1
      `,
      [userId],
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
    [friendId, ownerId],
  );
  await db.query(
    `
    UPDATE friends
    SET show_folders = TRUE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [ownerId, friendId],
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
    [friendId, ownerId],
  );
  await db.query(
    `
    UPDATE friends
    SET show_folders = FALSE
    WHERE user_id = $1 AND friend_id = $2
    `,
    [ownerId, friendId],
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
      [ownerId, viewerId],
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
      [folderId, ownerId, viewerId],
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
      [fileId, folderId, ownerId, viewerId],
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
    [ownerId, viewerId],
  );

  if (!result.rows.length) {
    return res.status(403).json({
      error: "Access revoked or not permitted",
    });
  }

  next();
};
