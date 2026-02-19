import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Header from "../../components/header/header";
import Cookies from "js-cookie";
import { toast } from "react-toastify";
import "./other-users.css";

const OtherUsers = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [originalUsers, setOriginalUsers] = useState([]);
  const [search, setSearch] = useState("");
  const pendingRequests = useRef(new Set());

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/all-users`, { withCredentials: true })
      .then((res) => setOriginalUsers(res.data.otherUsers));
  }, []);

  const filtered = useMemo(() => {
    return originalUsers.filter((u) =>
      u.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, originalUsers]);

  const connect = async (receiverId, name) => {
    if (pendingRequests.current.has(receiverId)) return;

    pendingRequests.current.add(receiverId);
    await axios.post(
      `${API_BASE_URL}/api/connect`,
      { receiverId },
      {
        withCredentials: true,
        headers: { "x-csrf-token": Cookies.get("csrfToken") },
      }
    );
    toast.success(`Request sent to ${name}`);
  };

return (
  <div className="users-page">
    <Header />

    <h2>Discover Users</h2>

    {/* Search */}
    <input
      className="search-input"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search users..."
    />

    {/* Users Grid */}
    <div className="users-grid">
      {filtered.map((u) => (
        <div key={u.id} className="user-card">
          <div className="avatar">{u.name[0]}</div>

          <h3>{u.public_id.slice(0, 10)}...</h3>

          <button className="connect-btn" onClick={() => connect(u.id, u.name)}>
            Connect
          </button>
        </div>
      ))}
    </div>
  </div>
);


};

export default OtherUsers;
