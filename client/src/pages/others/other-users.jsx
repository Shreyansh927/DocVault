import React, { useState, useEffect } from "react";
import axios from "axios";
import "./other-users.css";
import Header from "../../components/header/header";
import { MdOutlineNavigateNext } from "react-icons/md";

const OtherUsers = () => {
  const [users, setUsers] = useState([]);
  const [originalUsers, setOriginalUsers] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setUsers(originalUsers);
    } else {
      setUsers(
        originalUsers.filter((u) =>
          u.name.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, originalUsers]);

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get("http://localhost:4000/all-users");
      setUsers(res.data.otherUsers);
      setOriginalUsers(res.data.otherUsers);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <div className="users-page">
        <Header />
        <div
          className="users-header"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          <div>
            <h1>Users</h1>
            <p>Find people on SafeCloud</p>
          </div>
          <div>
            <input
              type="text"
              className="search-bar"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginTop: "10px" }}
            />
          </div>
        </div>

        <div className="users-grid">
          {users.length === 0
            ? Array.from({ length: 11 }).map((_, index) => (
                <div
                  className="folder-card skeleton-card"
                  style={{ display: "flex", justifyContent: "space-between" }}
                  key={index}
                >
                  <div>
                    <div className="folder-glow" />

                    {/* Skeleton title */}
                    <div className="skeleton skeleton-title" />

                    {/* Skeleton subtitle */}
                    <div className="skeleton skeleton-subtitle" />
                  </div>

                  <div style={{ paddingTop: "20px" }}>
                    <MdOutlineNavigateNext className="skeleton-icon" />
                  </div>
                </div>
              ))
            : users.map((user) => (
                <div className="user-card" key={user.id}>
                  <div className="avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>

                  <h3>{user.public_id}</h3>

                  <button className="connect-btn">Connect</button>
                </div>
              ))}
          {}
        </div>
      </div>
    </>
  );
};

export default OtherUsers;
