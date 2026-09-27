import { db } from "../db.js";

export const createRoom = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomName, selectedUsers } = req.body;

    // 1. Verify host
    const userResult = await db.query(
      `SELECT id, name FROM users WHERE id = $1`,
      [userId],
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({
        error: "User does not exist",
      });
    }

    const hostOfAlreadyActiveRoom = await db.query(
      `SELECT * FROM rooms WHERE host_id=$1 AND status='active'`,
      [userId],
    );

    if (hostOfAlreadyActiveRoom.rows[0]) {
      return res.status(403).json({
        error: `you are already the host of ${roomName} to create new fist end it`,
      });
    }

    // 2. Create room FIRST
    const roomResult = await db.query(
      `INSERT INTO rooms (host_id, name)
       VALUES ($1, $2)
       RETURNING id, name`,
      [userId, roomName],
    );

    const roomId = roomResult.rows[0].id;

    console.log("Created room:", roomId);

    // 3. Add host as room member
    await db.query(
      `INSERT INTO room_members
        (room_id, user_id, role, status, joined_at)
       VALUES
        ($1, $2, 'host', 'active', NOW())`,
      [roomId, userId],
    );

    // 4. Invite guests
    for (const guest of selectedUsers) {
      const guestId =
        typeof guest === "object" ? Number(guest.id) : Number(guest);

      console.log("Guest received:", guest);
      console.log("Guest ID:", guestId);

      const guestResult = await db.query(
        `SELECT id, name, auth_uuid
     FROM users
     WHERE id = $1`,
        [guestId],
      );

      const guestUser = guestResult.rows[0];

      if (!guestUser) {
        return res.status(404).json({
          error: `Guest ${guestId} does not exist`,
        });
      }

      if (!guestUser.auth_uuid) {
        return res.status(400).json({
          error: `Guest ${guestId} does not have an auth UUID`,
        });
      }

      await db.query(
        `INSERT INTO notifications
      (
        user_id,
        sender_id,
        sender_name,
        type,
        text_notification,
        room_name,
        room_id
      )
     VALUES
      ($1, $2, $3, $4, $5, $6, $7)`,
        [
          guestUser.auth_uuid,
          userId,
          userResult.rows[0].name,
          "ROOM_NOTIFICATION",
          `You have been invited to join room "${roomName}"`,
          roomName,
          roomId,
        ],
      );
    }

    return res.status(201).json({
      message: `Room ${roomName} created successfully`,
      room: {
        id: roomId,
        name: roomName,
      },
    });
  } catch (e) {
    console.error("Create room error:", e);

    return res.status(500).json({
      error: "Failed to create room",
    });
  }
};
