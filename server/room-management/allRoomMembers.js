import { db } from "../db.js";

export const allRoomMembersOfIndivisualRoomId = async (req, res) => {
  try {
    const userId = req.user.id;
    const { roomName, roomId } = req.query;
    const user = await db.query(`SELECT 1 FROM users WHERE id = $1`, [userId]);
    if (!user.rows[0]) {
      return res.status(404).json({ error: "user not found" });
    }
    const { rows } = await db.query(
      `
  SELECT
    rooms.id AS "roomId",
    room_members.user_id AS "guestId",
    room_members.status AS "guestStatus",
    room_members.role AS "guestRole",
    users.name AS "guestName"
  FROM room_members
  INNER JOIN rooms
    ON rooms.id = room_members.room_id
  INNER JOIN users
    ON room_members.user_id = users.id
  WHERE rooms.name = $1
    AND rooms.id = $2
  `,
      [roomName, roomId],
    );
    return res.status(200).json({ allRoomMembers: rows });
  } catch (e) {
    console.log(e);
    return res.status(500).json({});
  }
};
