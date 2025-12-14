import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const user = JSON.parse(localStorage.getItem("currentUserName"));

  const logout = async () => {
    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/logout",
        {},
        { withCredentials: true }
      );
      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Logout failed");
    }
  };

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <h3 className="logo">SafeCloud</h3>
        </div>

        <div className="header-right">
          <button
            className="header-btn secondary"
            onClick={() => navigate("/others")}
          >
            Users
          </button>

          <button
            className="header-btn danger"
            onClick={() => setShowLogoutModal(true)}
          >
            {user}
          </button>
        </div>
      </header>

      <div className="header-separator" />

      {/* ---------- Logout Modal ---------- */}
      {showLogoutModal && (
        <div
          className="logout-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to log out of SafeCloud?</p>

            <div className="logout-actions">
              <button
                className="logout-btn cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>

              <button className="logout-btn confirm" onClick={logout}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
