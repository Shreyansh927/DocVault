import { db } from "../db.js";
import { redisPublisher } from "../redis.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const { message } = req.body;
    const { recieverID, chatID } = req.params;

    if (!message || !recieverID) {
      return res.status(400).json({
        error: "Message and recieverID are required",
      });
    }

    const { rows } = await db.query(
      `
      INSERT INTO messages (
        chat_id,
        sender_id,
        content
      )
      VALUES ($1, $2, $3)
      RETURNING id, chat_id, sender_id, content
      `,
      [chatID, senderId, message],
    );

    const savedMessage = rows[0];

    // Notify receiver through Redis
    await redisPublisher.publish(
      "chat-messages",
      JSON.stringify({
        type: "new_message",
        id: savedMessage.id,
        chatId: savedMessage.chat_id,
        senderId: savedMessage.sender_id,
        receiverId: Number(recieverID),
        content: savedMessage.content,
      }),
    );

    res.status(200).json({
      message: "Message sent successfully",
    });
  } catch (err) {
    console.error("Error in sendMessage:", err);

    res.status(500).json({
      error: "Failed to send message",
    });
  }
};

export const editMessage = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { chatID, messageId } = req.params;
    const { content } = req.body;

    if (!content || chatID === undefined || messageId === undefined) {
      return res
        .status(400)
        .json({ error: "Content, chatID and messageId are required" });
    }

    await db.query(
      `UPDATE messages SET content = $1 WHERE id = $2 AND chat_id = $3 AND sender_id = $4`,
      [content, messageId, chatID, userId],
    );
    console.log(
      `Message with ID ${messageId} in chat ${chatID} edited by user ${userId}`,
    );
    res.status(200).json({ message: "Message edited successfully" });
  } catch (err) {
    console.error("Error in editMessage:", err);
    res.status(500).json({ error: "Failed to edit message" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { chatID, messageId } = req.params;

    // Find the message first
    const { rows } = await db.query(
      `
      SELECT sender_id
      FROM messages
      WHERE id = $1
        AND chat_id = $2
      `,
      [messageId, chatID],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: "Message not found",
      });
    }

    // Only sender can delete
    if (Number(rows[0].sender_id) !== userId) {
      return res.status(403).json({
        error: "Not allowed",
      });
    }

    // Get receiver
    const { rows: chatRows } = await db.query(
      `
      SELECT
        CASE
          WHEN user1_id = $1 THEN user2_id
          ELSE user1_id
        END AS receiver_id
      FROM chats
      WHERE id = $2
      `,
      [userId, chatID],
    );

    if (chatRows.length === 0) {
      return res.status(404).json({
        error: "Chat not found",
      });
    }

    const receiverId = Number(chatRows[0].receiver_id);

    // Delete
    await db.query(
      `
      DELETE FROM messages
      WHERE id = $1
        AND chat_id = $2
        AND sender_id = $3
      `,
      [messageId, chatID, userId],
    );

    // Notify receiver
    await redisPublisher.publish(
      "chat-messages",
      JSON.stringify({
        type: "message_deleted",
        messageId: Number(messageId),
        chatId: Number(chatID),
        receiverId,
      }),
    );

    console.log(
      `Message ${messageId} deleted. Notification sent to ${receiverId}`,
    );

    res.status(200).json({
      message: "Message deleted successfully",
    });
  } catch (err) {
    console.error("Error in deleteMessage:", err);

    res.status(500).json({
      error: "Failed to delete message",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { chatID } = req.params;
    const { rows } = await db.query(
      `
      select messages.id as id, messages.content, users.profile_image as profile_photo, users.name as username, messages.sender_id from messages inner join chats on chats.id = messages.chat_id inner join users on users.id = messages.sender_id where chats.id = $1 ORDER BY messages.id ASC
    `,
      [chatID],
    );
    res.status(200).json({ messages: rows });
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
