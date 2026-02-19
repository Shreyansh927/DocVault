import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const base_url = import.meta.env.VITE_API_BASE_URL;

  const userEmail = JSON.parse(
    localStorage.getItem("current-user"),
  ).name.toUpperCase();

  const userProfileImage = JSON.parse(
    localStorage.getItem("current-user"),
  ).profile_image;

  const logout = async () => {
    try {
      await axios.post(
        `${base_url}/api/auth/logout`,
        {},
        { withCredentials: true },
      );

      localStorage.removeItem("current-user");

      setShowLogoutModal(false);
      setLoggingOut(true);
      navigate("/login");
    } catch (err) {
      console.error(err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("current-user-email");
        navigate("/login");
      } else {
        alert("Logout failed. Try again.");
      }
    } finally {
      setLoggingOut(false);
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

          {userProfileImage ? (
            <img
              src={userProfileImage}
              alt="Profile"
              className="profile-image"
              onClick={() => setShowLogoutModal(true)}
              style={{ height: "50px", width: "50px", borderRadius: "50%", cursor: "pointer", objectFit: "cover", marginLeft: "12px" }}
            />
          ) : (
            <button
              className="header-btn danger"
              onClick={() => setShowLogoutModal(true)}
            >
              {userEmail || "Account"}
            </button>
          )}
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
                {loggingOut ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
