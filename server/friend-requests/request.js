import { db } from "../db.js";

/* ================= SEND REQUEST ================= */

export const sendRequest = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const receiverId = Number(req.body.receiverId);

    if (!senderId || !receiverId || senderId === receiverId) {
      return res.status(400).json({
        error: "Invalid request",
      });
    }

    await db.query("BEGIN");

    // Create connection request
    await db.query(
      `
      INSERT INTO connections (sender_id, receiver_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [senderId, receiverId],
    );

    // Create chat
    await db.query(
      `
      INSERT INTO chats (user1_id, user2_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [senderId, receiverId],
    );

    // Get sender information
    const senderResult = await db.query(
      `
      SELECT name, profile_image
      FROM users
      WHERE id = $1
      `,
      [senderId],
    );

    if (!senderResult.rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        error: "Sender not found",
      });
    }

    const sender = senderResult.rows[0];

    // Create notification for receiver
    await db.query(
      `
      INSERT INTO notifications
      (
        user_id,
        sender_id,
        sender_name,
        sender_profile_image,
        type,
        status
      )
      VALUES ($1, $2, $3, $4, 'FRIEND_REQUEST', 'PENDING')
      ON CONFLICT DO NOTHING
      `,
      [receiverId, senderId, sender.name, sender.profile_image],
    );

    await db.query("COMMIT");

    console.log("SEND REQUEST:", {
      senderId,
      receiverId,
    });

    return res.status(200).json({
      success: true,
      message: "Friend request sent successfully",
    });
  } catch (err) {
    await db.query("ROLLBACK");

    console.error("SEND REQUEST ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

// ACCEPT FRIEND REQUEST
export const acceptRequest = async (req, res) => {
  const receiverId = Number(req.user.id);
  const senderId = Number(req.body.senderId);

  if (!receiverId || !senderId || receiverId === senderId) {
    return res.status(400).json({
      error: "Invalid request",
    });
  }

  try {
    await db.query("BEGIN");

    // Get receiver information
    const receiverResult = await db.query(
      `
      SELECT name, profile_image
      FROM users
      WHERE id = $1
      `,
      [receiverId],
    );

    if (!receiverResult.rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        error: "Receiver not found",
      });
    }

    const receiver = receiverResult.rows[0];

    // Verify sender exists
    const senderResult = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [senderId],
    );

    if (!senderResult.rows.length) {
      await db.query("ROLLBACK");

      return res.status(404).json({
        error: "Sender not found",
      });
    }

    // Update receiver's original notification
    await db.query(
      `
      UPDATE notifications
      SET status = 'ACCEPTED'
      WHERE user_id = $1
        AND sender_id = $2
        AND type = 'FRIEND_REQUEST'
      `,
      [receiverId, senderId],
    );

    // Notify sender that request was accepted
    await db.query(
      `
      INSERT INTO notifications
      (
        user_id,
        sender_id,
        sender_name,
        sender_profile_image,
        type,
        status
      )
      VALUES ($1, $2, $3, $4, 'FRIEND_REQUEST_ACCEPTED', 'ACCEPTED')
      `,
      [senderId, receiverId, receiver.name, receiver.profile_image],
    );

    // Create friendship in both directions
    await db.query(
      `
      INSERT INTO friends (user_id, friend_id)
      VALUES ($1, $2), ($2, $1)
      ON CONFLICT DO NOTHING
      `,
      [receiverId, senderId],
    );

    await db.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Friend request accepted",
    });
  } catch (err) {
    await db.query("ROLLBACK");

    console.error("ACCEPT ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

/* ================= DENY FRIEND REQUEST ================= */
export const denyRequest = async (req, res) => {
  const receiverId = Number(req.user.id);
  const senderId = Number(req.body.senderId);

  if (!receiverId || !senderId || receiverId === senderId) {
    return res.status(400).json({
      error: "Invalid request",
    });
  }

  try {
    // Get receiver information
    const receiverResult = await db.query(
      `
      SELECT name, profile_image
      FROM users
      WHERE id = $1
      `,
      [receiverId],
    );

    if (!receiverResult.rows.length) {
      return res.status(404).json({
        error: "Receiver not found",
      });
    }

    const receiver = receiverResult.rows[0];

    // Verify sender exists
    const senderResult = await db.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [senderId],
    );

    if (!senderResult.rows.length) {
      return res.status(404).json({
        error: "Sender not found",
      });
    }

    // Remove original friend request notification
    await db.query(
      `
      DELETE FROM notifications
      WHERE user_id = $1
        AND sender_id = $2
        AND type = 'FRIEND_REQUEST'
      `,
      [receiverId, senderId],
    );

    // Notify sender that request was rejected
    await db.query(
      `
      INSERT INTO notifications
      (
        user_id,
        sender_id,
        sender_name,
        sender_profile_image,
        type,
        status
      )
      VALUES ($1, $2, $3, $4, 'FRIEND_REQUEST_REJECTED', 'REJECTED')
      `,
      [senderId, receiverId, receiver.name, receiver.profile_image],
    );

    return res.status(200).json({
      success: true,
      message: "Friend request rejected",
    });
  } catch (err) {
    console.error("DENY ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const removeFriend = async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const removeFriendId = Number(req.body.removeFriend);

    if (!currentUserId || !removeFriendId) {
      return res.status(400).json({
        error: "Invalid user ID",
      });
    }

    if (currentUserId === removeFriendId) {
      return res.status(400).json({
        error: "Cannot remove yourself",
      });
    }

    // Delete notifications between both users
    await db.query(
      `
      DELETE FROM notifications
      WHERE
        (user_id = $1 AND sender_id = $2)
        OR
        (user_id = $2 AND sender_id = $1)
      `,
      [currentUserId, removeFriendId],
    );

    // Delete connection
    await db.query(
      `
      DELETE FROM connections
      WHERE
        (sender_id = $1 AND receiver_id = $2)
        OR
        (sender_id = $2 AND receiver_id = $1)
      `,
      [currentUserId, removeFriendId],
    );

    // Delete friendship in both directions
    await db.query(
      `
      DELETE FROM friends
      WHERE
        (user_id = $1 AND friend_id = $2)
        OR
        (user_id = $2 AND friend_id = $1)
      `,
      [currentUserId, removeFriendId],
    );

    return res.status(200).json({
      success: true,
      message: "Friend removed from connection list successfully",
    });
  } catch (err) {
    console.error("REMOVE FRIEND ERROR:", err.message);

    return res.status(500).json({
      error: "Error removing friend",
    });
  }
};

/*======= GET CONNECTIONS == */
export const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.profile_image,
        f.show_folders,
        c.id AS connection_id
      FROM connections c
      JOIN users u
        ON (
          u.id = c.sender_id
          AND c.receiver_id = $1
        )
        OR (
          u.id = c.receiver_id
          AND c.sender_id = $1
        )
      JOIN friends f
        ON f.user_id = u.id
       AND f.friend_id = $1
      `,
      [userId],
    );

    return res.json({
      connections: result.rows,
      source: "db",
    });
  } catch (err) {
    console.error("GET CONNECTIONS ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

/* ================= TOGGLE FOLDER VISIBILITY ================= */
export const allowShowFolder = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const friendId = Number(req.body.connectionId);

    await db.query(
      `
      UPDATE friends
      SET show_folders = TRUE
      WHERE user_id = $1
        AND friend_id = $2
      `,
      [ownerId, friendId],
    );

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error("ALLOW ACCESS ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

export const restrictShowFolder = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const friendId = Number(req.body.connectionId);

    await db.query(
      `
      UPDATE friends
      SET show_folders = FALSE
      WHERE user_id = $1
        AND friend_id = $2
      `,
      [ownerId, friendId],
    );

    return res.json({
      success: true,
    });
  } catch (err) {
    console.error("RESTRICT ACCESS ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
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
        AND fr.show_folders = TRUE
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

export const getAccessControl = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `
      SELECT
        u.id,
        u.name,
        u.profile_image,
        f.show_folders
      FROM friends f
      JOIN users u
        ON u.id = f.friend_id
      WHERE f.user_id = $1
      `,
      [userId],
    );

    return res.json({
      connections: result.rows,
    });
  } catch (err) {
    console.error("GET ACCESS CONTROL ERROR:", err.message);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
