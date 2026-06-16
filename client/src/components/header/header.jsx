import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiBarChart2, FiBell, FiLink2, FiLock } from "react-icons/fi";
import "./header.css";

const Header = () => {
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const base_url = import.meta.env.VITE_API_BASE_URL;

  const user = JSON.parse(localStorage.getItem("current-user"));

  const userEmail = user?.name?.toUpperCase() || "";
  const userProfileImage = user?.profile_image || null;

  const navItems = [
    { label: "Users", icon: FiUsers, path: "/others" },
    { label: "Dashboard", icon: FiBarChart2, path: "/dashboard" },
    { label: "Notifications", icon: FiBell, path: "/notifications" },
    { label: "Connections", icon: FiLink2, path: "/connections" },
    { label: "Control", icon: FiLock, path: "/access-control" },
  ];

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
      navigate("/login", { replace: true });
      window.location.href = "/login";
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
        <div className="header-logo" onClick={() => navigate("/home")}>
          <img
            src="https://png.pngtree.com/png-clipart/20250207/original/pngtree-cloud-storage-optimization-service-featuring-a-3d-icon-isolated-on-transparent-png-image_20375425.png"
            alt="SafeCloud"
          />
          <span className="logo-text">DocVault</span>
        </div>

        <nav className="header-nav">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className="nav-btn"
                onClick={() => navigate(item.path)}
                title={item.label}
              >
                <IconComponent className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="header-profile">
          {userProfileImage ? (
            <button
              className="profile-btn"
              onClick={() => setShowLogoutModal(true)}
              title="Account menu"
            >
              <img src={userProfileImage} alt="Profile" />
            </button>
          ) : (
            <button
              className="profile-btn profile-btn--fallback"
              onClick={() => setShowLogoutModal(true)}
              title="Account menu"
            >
              <span>👤</span>
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
