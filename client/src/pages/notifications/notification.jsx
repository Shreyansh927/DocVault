import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import Header from "../../components/header/header.jsx";
import { supabase } from "../../supabaseClient";
import { toast } from "react-toastify";
import "./notification.css";
import AskAi from "../../ask-ai/ask-ai.jsx";

const Notifications = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [notifications, setNotifications] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/auth/me`, { withCredentials: true })
      .then((res) => setUser(res.data))
      .catch(() => toast.error("Auth failed"));
  }, [API_BASE_URL]);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/notifications`, {
        withCredentials: true,
      });
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

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
  }, [user, fetchNotifications]);

  return (
    <div className="notifications-page">
      <Header />
      <AskAi />
      <main className="notifications-shell">
        <section className="notifications-hero">
          <div>
            <p className="notifications-tag">Notifications</p>
            <h1 className="notifications-title">Stay on top of every update</h1>
            <p className="notifications-description">
              All alerts, friend requests, and permission updates in one
              polished feed.
            </p>
          </div>

          <aside className="notifications-summary">
            <div className="summary-pill">
              <span>Total alerts</span>
              <strong>{loading ? "--" : notifications.length}</strong>
            </div>
            <div className="summary-pill soft">
              <span>Pending actions</span>
              <strong>
                {loading
                  ? "--"
                  : notifications.filter(
                      (n) =>
                        n.type === "FRIEND_REQUEST" && n.status === "PENDING",
                    ).length}
              </strong>
            </div>
          </aside>
        </section>

        <section className="notifications-panel">
          {loading ? (
            <div className="notification-empty">Loading notifications…</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <h2>No notifications yet</h2>
              <p>
                Once activity happens, you’ll see it here in a clean premium
                stream.
              </p>
            </div>
          ) : (
            <div className="notifications-list">
              {notifications.map((n) => (
                <article key={n.id} className="notification-card">
                  <div className="notification-header">
                    <div>
                      <p className="notification-type">
                        {n.type.replace(/_/g, " ")}
                      </p>
                      <p className="notification-body">
                        {n.type === "FRIEND_REQUEST" &&
                          n.status === "PENDING" && (
                            <>
                              <strong>{n.sender_name}</strong> sent you a friend
                              request.
                            </>
                          )}
                        {n.type === "FRIEND_REQUEST" &&
                          n.status === "ACCEPTED" && (
                            <>
                              You accepted <strong>{n.sender_name}</strong>'s
                              request.
                            </>
                          )}
                        {n.type === "FRIEND_REQUEST_ACCEPTED" && (
                          <>
                            <strong>{n.sender_name}</strong> accepted your
                            friend request.
                          </>
                        )}
                        {n.type === "FRIEND_REQUEST_REJECTED" && (
                          <>
                            <strong>{n.sender_name}</strong> rejected your
                            friend request.
                          </>
                        )}
                      </p>
                    </div>
                    <span className="notification-badge">
                      {n.status.toLowerCase()}
                    </span>
                  </div>

                  {n.type === "FRIEND_REQUEST" && n.status === "PENDING" && (
                    <div className="notification-actions">
                      <button
                        className="btn btn-primary"
                        onClick={() => acceptRequest(n.sender_id)}
                      >
                        Accept
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => denyRequest(n.sender_id)}
                      >
                        Deny
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Notifications;
