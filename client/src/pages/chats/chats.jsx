import React, { useCallback, useEffect, useRef, useState } from "react";
import Header from "../../components/header/header";
import { useParams } from "react-router-dom";
import axios from "axios";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./chats.css";

const Chats = () => {
  const storedUser = localStorage.getItem("current-user");
  const loggedInUser = storedUser ? JSON.parse(storedUser) : null;
  const [user, setUser] = useState(null);
  const { friendId, friendName, connectionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [unsent, setUnsent] = useState([]);
  const [loading, setLoading] = useState(true);
  const chatContainerRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const chatID = connectionId;

  const isOwnMessage = (senderId) =>
    parseInt(senderId, 10) === parseInt(loggedInUser?.id, 10);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/messages/get/${connectionId}`,
        { withCredentials: true },
      );

      const safeMessages = (res.data.messages || []).filter(
        (msg) => msg && msg.id,
      );
      setMessages(safeMessages);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, connectionId]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, [API_BASE_URL]);

  useEffect(() => {
    if (!user?.id) return;
    fetchMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${connectionId}`,
        },
        () => {
          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, connectionId, fetchMessages]);

  useEffect(() => {
    const stored = localStorage.getItem("unsent-messages");
    if (stored) {
      setUnsent(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (navigator.onLine) {
      retrySendMessage();
    }
  }, [unsent]);

  useEffect(() => {
    const handleOnline = () => {
      retrySendMessage();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [unsent]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    try {
      await axios.post(
        `${API_BASE_URL}/api/messages/send/${friendId}/${chatID}`,
        { message: trimmedMessage },
        { withCredentials: true },
      );
      setNewMessage("");
      fetchMessages();
    } catch (err) {
      console.error(err);
      const updatedUnsent = [...unsent, trimmedMessage];
      setUnsent(updatedUnsent);
      localStorage.setItem("unsent-messages", JSON.stringify(updatedUnsent));
      toast.warn(
        "Message saved locally; it will send when you're back online.",
      );
    }
  };

  const retrySendMessage = async () => {
    if (unsent.length === 0) return;

    const remaining = [];
    for (const msg of unsent) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/messages/send/${friendId}/${chatID}`,
          { message: msg },
          { withCredentials: true },
        );
      } catch (err) {
        console.error(err);
        remaining.push(msg);
      }
    }
    setUnsent(remaining);
    localStorage.setItem("unsent-messages", JSON.stringify(remaining));
    if (remaining.length === 0) {
      fetchMessages();
    }
  };

  const editChat = async (messageId) => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/messages/edit/${chatID}/${messageId}`,
        { content: editedMessage },
        { withCredentials: true },
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

  const deleteChat = async (messageId) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/api/messages/delete/${chatID}/${messageId}`,
        { withCredentials: true },
      );
      fetchMessages();
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete message");
    }
  };

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
                  className={`message-row ${own ? "message-row--outgoing" : "message-row--incoming"}`}
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
                    className={`message-bubble ${own ? "message-bubble--outgoing" : "message-bubble--incoming"}`}
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
