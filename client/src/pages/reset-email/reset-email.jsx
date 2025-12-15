import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./reset-email.css";

const ResetEmail = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:4000/api/forgot/reset-password",
        { email },
        { withCredentials: true }
      );

      localStorage.setItem("current-user-email", JSON.stringify(email));
      alert(res.data.message);
      navigate("/otp-field");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      {/* ---------- Card ---------- */}
      <div className="reset-card">
        <h2>Reset your password</h2>
        <p>
          Enter your registered email address. We’ll send you a one-time OTP to
          verify your identity.
        </p>

        <form className="reset-form" onSubmit={submit}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        <span className="back-link" onClick={() => navigate("/login")}>
          ← Back to login
        </span>
      </div>
    </div>
  );
};

export default ResetEmail;
