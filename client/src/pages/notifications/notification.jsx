import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/header/header.jsx";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./notification.css";

const Notifications = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);

  /* ================= FETCH AUTH USER ================= */
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, []);

  /* ================= FETCH NOTIFICATIONS ================= */
  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    }
  };

  /* ================= ACCEPT ================= */
  const acceptRequest = async (senderId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/accept`,
        { senderId },
        { withCredentials: true },
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n.sender_id === senderId && n.type === "FRIEND_REQUEST"
            ? { ...n, status: "ACCEPTED" }
            : n,
        ),
      );

      toast.success("Friend request accepted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept request");
    }
  };

  /* ================= DENY ================= */
  const denyRequest = async (senderId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/deny`,
        { senderId },
        { withCredentials: true },
      );

      setNotifications((prev) =>
        prev.filter(
          (n) => !(n.sender_id === senderId && n.type === "FRIEND_REQUEST"),
        ),
      );

      toast.error("Friend request rejected");
    } catch (err) {
      console.error(err);
      toast.error("Failed to reject request");
    }
  };

  /* ================= REALTIME ================= */
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => {
            if (prev.some((n) => n.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
          toast.info("New notification received");
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  /* ================= UI ================= */
  return (
    <div className="notifications-wrapper">
      <Header />

      <div className="notifications-container">
        <h1>Notifications</h1>

        {notifications.length === 0 && (
          <p className="empty-state">No notifications yet</p>
        )}

        {notifications.map((n) => (
          <div key={n.id} className="notification-card">
            {/* FRIEND REQUEST */}
            {n.type === "FRIEND_REQUEST" && n.status === "PENDING" && (
              <>
                <p>
                  <strong>{n.sender_name}</strong> sent you a friend request
                </p>
                <div className="notification-actions">
                  <button onClick={() => acceptRequest(n.sender_id)}>
                    Accept
                  </button>
                  <button onClick={() => denyRequest(n.sender_id)}>Deny</button>
                </div>
              </>
            )}

            {/* YOU ACCEPTED */}
            {n.type === "FRIEND_REQUEST" && n.status === "ACCEPTED" && (
              <p>
                You accepted <strong>{n.sender_name}</strong>'s request
              </p>
            )}

            {/* THEY ACCEPTED */}
            {n.type === "FRIEND_REQUEST_ACCEPTED" && (
              <p>
                <strong>{n.sender_name}</strong> accepted your friend request
              </p>
            )}

            {/* THEY REJECTED */}
            {n.type === "FRIEND_REQUEST_REJECTED" && (
              <p>
                <strong>{n.sender_name}</strong> rejected your friend request
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
