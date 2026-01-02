import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./set-password.css";

const SetPassword = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const email = JSON.parse(localStorage.getItem("current-user-email"));
  const navigate = useNavigate();

  if (!email) {
    return (
      <p className="error-text">
        Session expired. Please restart password reset.
      </p>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/forgot/set-new-password`,
        { email, password },
        { withCredentials: true }
      );

      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="set-password-page">
      <div className="set-password-card">
        <h2>Set New Password</h2>
        <p>Create a strong password to secure your account</p>

        <form className="set-password-form" onSubmit={submit}>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        <span className="back-link" onClick={() => navigate("/login")}>
          ← Back to login
        </span>
      </div>
    </div>
  );
};

export default SetPassword;
