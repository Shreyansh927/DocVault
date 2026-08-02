import { useCallback, useEffect, useMemo, useState } from "react";
import { saveUsers, getUsers } from "../../utils/offlineDB";
import axios from "axios";
import Header from "../../components/header/header";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import "./other-users.css";
import AskAi from "../../ask-ai/ask-ai";
import api from "../../api-interceptor";

const OtherUsers = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [originalUsers, setOriginalUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const f = async () => {
      await api.get("/api/auth/refresh");
      // toast.info("session re-created");
    };
    f();
    fetchUsers();
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/all-users`, {
        withCredentials: true,
      });
      setOriginalUsers(res.data.otherUsers || []);
      // await saveUsers(res.data.otherUsers);
    } catch (err) {
      console.error(err);

      // const cachedUsers = await getUsers();

      // if (cachedUsers.length > 0) {
      //   setOriginalUsers(cachedUsers);
      //   toast.info("Showing offline data");
      // } else {
      //   toast.error("No offline data available");
      // }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    const handleOnline = () => {
      toast.success("Back online");
      fetchUsers();
    };

    const handleOffline = () => {
      toast.warning("Offline mode");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    return originalUsers.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search, originalUsers]);

  const connect = async (receiverId, name) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/connect`,
        { receiverId },
        {
          withCredentials: true,
          // headers: { "x-csrf-token": Cookies.get("csrfToken") },
        },
      );
      toast.success(`Request sent to ${name}`);
      fetchUsers()
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to send request");
    }
  };

  const SkeletonCard = () => (
    <div className="user-card skeleton">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-btn"></div>
    </div>
  );

  return (
    <>
      <Header />
      <AskAi />
      <div className="users-wrapper">
        <main className="users-shell">
          <section className="users-hero">
            <div>
              <p className="users-tag">Connect</p>
              <h1 className="users-title">Discover people</h1>
              <p className="users-subtitle">
                Find and connect with other users on the platform. Expand your
                network and collaborate.
              </p>
            </div>
          </section>

          <div className="search-wrapper">
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              disabled={loading}
            />
            {search && (
              <span className="search-hint">
                Found {filtered.length} user{filtered.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="users-grid">
            {loading
              ? Array.from({ length: 9 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))
              : filtered.map((u) => (
                  <div key={u.id} className="user-card">
                    <div className="user-avatar">{u.name[0].toUpperCase()}</div>

                    <div className="user-info">
                      <h3>{u.name}</h3>
                      <p>{u.public_id.slice(0, 12)}...</p>
                    </div>

                    <button
                      className={
                        u.status === "PENDING"
                          ? "connect-btn-pending"
                          : "connect-btn"
                      }
                      onClick={() => connect(u.id, u.name)}
                      disabled={u.status === "PENDING"}
                    >
                      {u.status === "PENDING" ? "PENDING..." : "SEND"}
                    </button>
                  </div>
                ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="empty-state">
              <p>No users found</p>
              <span>Try adjusting your search</span>
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default OtherUsers;
