import { db } from "../db.js";
import { redis } from "../redis.js";

export const sendMessage = async (req, res) => {
  try {
    const senderId = Number(req.user.id);
    const { message } = req.body;
    const { recieverID, chatID } = req.params;

    if (!message || !recieverID) {
      return res
        .status(400)
        .json({ error: "Message and recieverID are required" });
    }

    await db.query(
      `
  INSERT INTO messages (chat_id, sender_id, content)
  VALUES ($1, $2, $3)
  `,
      [chatID, senderId, message],
    );

    res.status(200).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error in sentMessage:", err);
    res.status(500).json({ error: "Failed to send message" });
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
    const userId = req.user.id;
    const { chatID, messageId } = req.params;

    await db.query(
      `
      DELETE FROM messages WHERE id = $1 AND chat_id = $2 AND sender_id = $3`,
      [messageId, chatID, userId],
    );
    console.log(
      `Message with ID ${messageId} deleted from chat ${chatID} by user ${userId}`,
    );

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (err) {
    console.log(
      `Message with ID ${messageId} deleted from chat ${chatID} by user ${userId}`,
    );
    console.error("Error in deleteMessage:", err);
    res.status(500).json({ error: "Failed to delete message" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const { chatID } = req.params;
    const { rows } = await db.query(
      `
      select messages.id as id, messages.content, users.profile_image as profile_photo, users.name as username, messages.sender_id from messages inner join chats on chats.id = messages.chat_id inner join users on users.id = messages.sender_id where chats.id = $1 
    `,
      [chatID],
    );
    res.status(200).json({ messages: rows });
  } catch (err) {
    console.error("Error in getMessages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};
