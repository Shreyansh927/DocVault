import React, { useState } from "react";
import Header from "../../components/header/header";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";
import { TbLaurelWreath1 } from "react-icons/tb";
import "./chats.css";
import { useRef } from "react";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";

const Chats = () => {
  const loggedInUserId = JSON.parse(localStorage.getItem("current-user"));
  const [user, setUser] = useState(null);
  const { friendId, friendName, connectionId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedMessage, setEditedMessage] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const chatID = connectionId; // Assuming connectionId is the same as chatID
  const chatContainerRef = useRef(null);
  const [unsent, setUnsent] = useState([]);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, []);
  
  const channel = supabase.channel(`chat-${chatID}`);

  useEffect(() => {
    channel.subscribe();
  }, []);

  const handleTyping = (value) => {
    setNewMessage(value);

    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: loggedInUserId.id },
    });
  };


  /* ================= REALTIME ================= */
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
        (payload) => {
          console.log("New connection change:", payload);

          fetchMessages();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleOnline = () => {
      console.log("Back online. Retrying...");
      retrySendMessage();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [unsent]);

  useEffect(() => {
    const stored = localStorage.getItem("unsent-messages");
    if (stored) {
      setUnsent(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    const chatID = connectionId; // Assuming connectionId is the same as chatID
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/messages/get/${chatID}`,
        {
          withCredentials: true,
        },
      );
      setMessages(res.data.messages);
      setEditedMessage(res.data.messages[0]?.content || ""); // Set initial edited message to the first message's content
    } catch (err) {
      console.error(err);
      setMessages([err.message || "Failed to fetch messages"]);
    }
  };

  const sendMessage = async () => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/messages/send/${friendId}/${chatID}`,
        { message: newMessage },
        {
          withCredentials: true,
        },
      );

      setNewMessage("");
      fetchMessages(); // Refresh messages after sending
    } catch (err) {
      console.error(err);

      const updatedUnsent = [...unsent, newMessage];

      setUnsent(updatedUnsent);
      localStorage.setItem("unsent-messages", JSON.stringify(updatedUnsent));
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
        console.log(err);
        remaining.push(msg);
      }
    }

    setUnsent(remaining);
    localStorage.setItem("unsent-messages", JSON.stringify(remaining));

    if (remaining.length === 0) {
      fetchMessages();
    }
  };

  useEffect(() => {
    if (navigator.onLine) {
      retrySendMessage();
    }
  }, [unsent]);

  const editChat = async (messageId) => {
    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/messages/edit/${chatID}/${messageId}`,
        { content: editedMessage },
        {
          withCredentials: true,
        },
      );
      setEditMode(false);
      setEditingMessageId(null);

      fetchMessages(); // Refresh messages after editing
    } catch (err) {
      console.error(err);
    }
  };

  const deleteChat = async (messageId) => {
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/api/messages/delete/${chatID}/${messageId}`,
        {
          withCredentials: true,
        },
      );

      fetchMessages(); // Refresh messages after deletion
    } catch (err) {
      console.error(err);
      alert("Failed to delete message");
    }
  };

  useEffect(() => {
    // Fetch messages for this chat using friendId
    fetchMessages();
  }, []);

  return (
    <div className="chat-wrapper">
      <Header />

      <div className="chat-container">
        <p>{friendName}</p>

        <div className="chat-messages" ref={chatContainerRef}>
          {messages.length > 0 ? (
            messages.map((msg) => (
              <>
                <div
                  key={msg.id}
                  className={
                    parseInt(msg.sender_id) === parseInt(loggedInUserId.id)
                      ? "left"
                      : "right"
                  }
                >
                  <div className="chat-avatar">
                    <img src={msg.profile_photo} alt="profile" />
                  </div>
                  <div className="chat-content">
                    <p className="chat-username">{msg.username}</p>
                    {editMode && msg.id === editingMessageId ? (
                      <input
                        type="text"
                        value={editedMessage}
                        onChange={(e) => setEditedMessage(e.target.value)}
                      />
                    ) : (
                      <p className="chat-text">{msg.content}</p>
                    )}
                  </div>

                  {parseInt(msg.sender_id) === parseInt(loggedInUserId.id) && (
                    <>
                      <button type="button" onClick={() => deleteChat(msg.id)}>
                        delete
                      </button>
                      {editMode ? (
                        <button
                          onClick={() => {
                            editChat(msg.id);
                          }}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setEditMode(!editMode);
                            setEditingMessageId(msg.id);
                            setEditedMessage(msg.content);
                          }}
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            ))
          ) : (
            <p className="no-messages">No messages yet</p>
          )}
        </div>

        <div className="chat-input-container">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default Chats;
