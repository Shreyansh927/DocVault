import React, { useCallback, useEffect, useRef, useState } from "react";

import Header from "../../components/header/header";
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

import "./chats.css";

const Chats = () => {
  const storedUser = localStorage.getItem("current-user");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;

  const { friendId, friendName, connectionId } = useParams();

  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [loading, setLoading] = useState(true);

  const chatContainerRef = useRef(null);
  const socketRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const WS_URL =
    loggedInUser?.id === 36
      ? "ws://localhost:5000/ws"
      : "ws://localhost:5001/ws";

  const chatID = connectionId;

  // -----------------------------
  // Fetch messages
  // -----------------------------

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/messages/get/${connectionId}`,
        {
          withCredentials: true,
        },
      );

      setMessages((res.data.messages || []).filter((msg) => msg && msg.id));
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, connectionId]);

  // -----------------------------
  // Get logged-in user
  // -----------------------------

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, {
        withCredentials: true,
      })
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        toast.error("Auth failed");
      });
  }, [API_BASE_URL]);

  // -----------------------------
  // WebSocket
  // -----------------------------

  useEffect(() => {
    if (!user?.id) return;

    fetchMessages();

    const socket = new WebSocket(WS_URL);

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected");

      socket.send(
        JSON.stringify({
          type: "connect",
          userId: user.id,
        }),
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      console.log("WebSocket message:", data);

      if (
        data.type === "new_message" &&
        Number(data.chatId) === Number(connectionId)
      ) {
        fetchMessages();
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [user, connectionId, fetchMessages, WS_URL]);

  // -----------------------------
  // Auto scroll
  // -----------------------------

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // -----------------------------
  // Send message
  // -----------------------------

  const sendMessage = async () => {
    const message = newMessage.trim();

    if (!message) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/messages/send/${friendId}/${chatID}`,
        {
          message,
        },
        {
          withCredentials: true,
        },
      );

      setNewMessage("");

      fetchMessages();
    } catch (err) {
      console.error(err);

      toast.error("Failed to send message");
    }
  };

  // -----------------------------
  // Edit message
  // -----------------------------

  const editChat = async (messageId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/messages/edit/${chatID}/${messageId}`,
        {
          content: editedMessage,
        },
        {
          withCredentials: true,
        },
      );

      setEditMode(false);
      setEditingMessageId(null);
      setEditedMessage("");

      fetchMessages();
    } catch (err) {
      console.error(err);

      toast.error("Failed to update message");
    }
  };

  // -----------------------------
  // Delete message
  // -----------------------------

  const deleteChat = async (messageId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/messages/delete/${chatID}/${messageId}`,
        {
          withCredentials: true,
        },
      );

      fetchMessages();
    } catch (err) {
      console.error(err);

      toast.error("Failed to delete message");
    }
  };

  // -----------------------------
  // Helpers
  // -----------------------------

  const isOwnMessage = (senderId) =>
    Number(senderId) === Number(loggedInUser?.id);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div className="chat-wrapper">
      <Header />

      <div className="chat-container">
        <div className="chat-topbar">
          <div className="chat-profile">
            <div className="chat-indicator" />

            <div>
              <p className="chat-friend-name">{friendName}</p>

              <p className="chat-friend-status">Active now</p>
            </div>
          </div>

          <div className="chat-meta">
            <span>{messages.length} messages</span>
          </div>
        </div>

        <div className="chat-messages" ref={chatContainerRef}>
          {loading ? (
            <div className="chat-empty">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="chat-empty">
              <h2>Welcome to your chat</h2>

              <p>Send the first message to start the conversation.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const own = isOwnMessage(msg.sender_id);

              return (
                <div
                  key={msg.id}
                  className={`message-row ${
                    own ? "message-row--outgoing" : "message-row--incoming"
                  }`}
                >
                  {!own && (
                    <div className="message-avatar">
                      <img
                        src={
                          msg.profile_photo || "https://via.placeholder.com/40"
                        }
                        alt={msg.username}
                      />
                    </div>
                  )}

                  <div
                    className={`message-bubble ${
                      own
                        ? "message-bubble--outgoing"
                        : "message-bubble--incoming"
                    }`}
                  >
                    <div className="message-header">
                      <span className="message-sender">
                        {own ? "You" : msg.username}
                      </span>

                      <span className="message-time">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>

                    {editMode && msg.id === editingMessageId ? (
                      <div className="message-edit-box">
                        <input
                          type="text"
                          value={editedMessage}
                          onChange={(e) => setEditedMessage(e.target.value)}
                        />
                      </div>
                    ) : (
                      <p className="message-text">{msg.content}</p>
                    )}

                    {own && (
                      <div className="message-actions">
                        <button
                          className="message-action"
                          onClick={() => deleteChat(msg.id)}
                          type="button"
                        >
                          Delete
                        </button>

                        <button
                          className="message-action"
                          onClick={() => {
                            setEditMode(true);
                            setEditingMessageId(msg.id);
                            setEditedMessage(msg.content);
                          }}
                          type="button"
                        >
                          Edit
                        </button>

                        {editMode && msg.id === editingMessageId && (
                          <button
                            className="message-action message-action--save"
                            onClick={() => editChat(msg.id)}
                            type="button"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type a message"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button
            className="chat-send-button"
            onClick={sendMessage}
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chats;
