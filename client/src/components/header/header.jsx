import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ FIX 1: correct localStorage key
  const userEmail = JSON.parse(localStorage.getItem("current-user-email"));

  const logout = async () => {
    try {
      await axios.post(
        "http://localhost:4000/api/auth/logout",
        {},
        { withCredentials: true } // ✅ REQUIRED
      );

      // ✅ FIX 2: clear client-side state
      localStorage.removeItem("current-user-email");

      setShowLogoutModal(false);
      navigate("/login");
    } catch (err) {
      console.error(err);

      // ✅ FIX 3: handle auth failure gracefully
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("current-user-email");
        navigate("/login");
      } else {
        alert("Logout failed. Try again.");
      }
    }
  };

  return (
    <>
      <header className="app-header">
        <div onClick={() => navigate("/home")} className="header-left">
          <img
            src="https://png.pngtree.com/png-clipart/20250207/original/pngtree-cloud-storage-optimization-service-featuring-a-3d-icon-isolated-on-transparent-png-image_20375425.png"
            alt="SafeCloud"
            style={{ height: "70px", width: "80px" }}
          />
        </div>

        <div className="header-right">
          <button
            className="header-btn secondary"
            onClick={() => navigate("/others")}
          >
            Users
          </button>
          <button
            className="header-btn success"
            onClick={() => navigate("/dashboard")}
          >
            Dashboard
          </button>
          <button
            className="header-btn success"
            onClick={() => navigate("/notifications")}
          >
            Notifications
          </button>
          <button
            className="header-btn success"
            onClick={() => navigate("/connections")}
          >
            Connections
          </button>
          <button
            className="header-btn success"
            onClick={() => navigate("/access-control")}
          >
            Access Control
          </button>

          <button
            className="header-btn danger"
            onClick={() => setShowLogoutModal(true)}
          >
            {userEmail || "Account"}
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
