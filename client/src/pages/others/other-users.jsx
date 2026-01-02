import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../../components/header/header";
import Cookies from "js-cookie";
import "./other-users.css";

const OtherUsers = () => {
  const [originalUsers, setOriginalUsers] = useState([]);
  const [search, setSearch] = useState("");
  // const [requestStatus, setRequestStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const csrfToken = Cookies.get("csrfToken");

  const filterUsers = useMemo(() => {
    if (!search.trim()) return originalUsers;
    return originalUsers.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, originalUsers]);

  // const sentRequestsId = useMemo(() => {
  //   return new Set(filterUsers.map((user) => user.id));
  // }, [filterUsers]);

  const pendingRequestsRefs = useRef(new Set());

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/all-users", {
        withCredentials: true,
      });
      // alert(res.data.message);
      setOriginalUsers(res.data.otherUsers);
      setLoading(false);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  const connect = async (receiverId) => {
    if (pendingRequestsRefs.current.has(receiverId)) {
      return;
    }

    pendingRequestsRefs.current.add(receiverId);
    try {
      const csrfToken = Cookies.get("csrfToken");

      await axios.post(
        "http://localhost:4000/api/connect",
        { receiverId },
        {
          withCredentials: true,
          headers: { "x-csrf-token": csrfToken },
        }
      );
      setP(true);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  };

  return (
    <div className="users-page">
      <Header />
      <h2>Other Users</h2>
      <input
        type="text"
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      <div className="users-grid">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="user-card skeleton">
                <div className="avatar skeleton-box" />
                <div className="skeleton-line" />
                <div className="skeleton-btn" />
              </div>
            ))
          : filterUsers.map((user) => (
              <div className="user-card" key={user.id}>
                <div className="avatar">{user.name[0].toUpperCase()}</div>

                <h3>{user.public_id}</h3>

                <button
                  className="connect-btn"
                  onClick={() => connect(user.id)}
                >
                  Connect
                </button>
              </div>
            ))}
      </div>
    </div>
  );
};

export default OtherUsers;
