import { useEffect, useState } from "react";
import { socket } from "../../socket";
import Cookies from "js-cookie";
import axios from "axios";
import Header from "../../components/header/header.jsx";
import "./notification.css";

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [sharedFolders, setSharedFolders] = useState([]);
  const csrfToken = Cookies.get("csrfToken");

  const fetchNotifications = async () => {
    const res = await axios.get("http://localhost:4000/api/notifications", {
      withCredentials: true,
    });
    setNotifications(res.data.notifications);
  };

  useEffect(() => {
    fetchNotifications();

    socket.on("friend-request", (data) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === data.id)) return prev;
        return [
          {
            id: data.id,
            sender_id: data.senderId,
            sender_name: data.name,
            sender_profile_image: data.profile_image,
            status: data.status,
            created_at: data.created_at,
            type: "FRIEND_REQUEST",
          },
          ...prev,
        ];
      });
    });

    socket.on("friend-request-response", (data) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === data.notification.id)) return prev;
        return [data.notification, ...prev];
      });

      setSharedFolders(data.sharedFolders || []);
    });

    return () => {
      socket.off("friend-request");
      socket.off("friend-request-response");
    };
  }, []);

  const accept = async (senderId) => {
    await axios.post(
      "http://localhost:4000/api/accept",
      { senderId },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } }
    );
    fetchNotifications();
  };

  const deny = async (senderId) => {
    await axios.post(
      "http://localhost:4000/api/deny",
      { senderId },
      { withCredentials: true, headers: { "x-csrf-token": csrfToken } }
    );
    setNotifications((prev) => prev.filter((n) => n.sender_id !== senderId));
  };

  return (
    <div className="notifications-wrapper">
      <Header />

      <div className="notifications-container">
        <h1 className="notifications-title">Notifications</h1>
        <p className="notifications-subtitle">
          Stay updated with connection requests and activity.
        </p>

        {notifications.length === 0 && (
          <div className="empty-state">No notifications yet</div>
        )}

        <div className="notifications-list">
          {notifications.map((n) => (
            <div key={n.id} className="notification-card">
              <div className="notification-left">
                <img
                  src={n.sender_profile_image}
                  alt={n.sender_name}
                  className="notification-avatar"
                />
              </div>

              <div className="notification-content">
                <p className="notification-text">
                  {n.type === "FRIEND_REQUEST" && (
                    <>
                      <strong>{n.sender_name}</strong> sent you a friend request
                    </>
                  )}

                  {n.type === "FRIEND_REQUEST_ACCEPTED" && (
                    <>✅ Your friend request was accepted</>
                  )}

                  {n.type === "FRIEND_REQUEST_REJECTED" && (
                    <>❌ Your friend request was rejected</>
                  )}
                </p>

                <p className="notification-time">
                  {new Date(n.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>

                <span className={`status-badge ${n.status.toLowerCase()}`}>
                  {n.status}
                </span>

                {n.status === "PENDING" && (
                  <div className="notification-actions">
                    <button
                      className="btn accept"
                      onClick={() => accept(n.sender_id)}
                    >
                      Accept
                    </button>
                    <button
                      className="btn deny"
                      onClick={() => deny(n.sender_id)}
                    >
                      Deny
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ===== SHARED FOLDERS ===== */}
        {sharedFolders.length > 0 && (
          <div className="shared-section">
            <h2 className="shared-title">Shared Folders</h2>

            <div className="shared-grid">
              {sharedFolders.map((folder) => (
                <div key={folder.id} className="shared-card">
                  <strong>{folder.name}</strong>
                  <p>
                    Created on{" "}
                    {new Date(folder.created_at).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
