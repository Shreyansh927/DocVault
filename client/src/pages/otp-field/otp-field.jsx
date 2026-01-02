import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./otp-field.css";

const OtpField = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const email = JSON.parse(localStorage.getItem("current-user-email"));

  if (!email) {
    return <p className="error-text">Email not found. Please restart reset.</p>;
  }

  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const updatedOtp = [...otp];
    updatedOtp[index] = value;
    setOtp(updatedOtp);

    // auto-focus next input
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/forgot/verify-otp`,
        { email, otp: otp.join("") },
        { withCredentials: true }
      );

      alert(res.data.message);
      navigate("/set-new-password");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="otp-card">
        <h2>Verify OTP</h2>
        <p>
          Enter the 4-digit code sent to <strong>{email}</strong>
        </p>

        <form className="otp-form" onSubmit={submit}>
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                required
              />
            ))}
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <span className="back-link" onClick={() => navigate("/reset-email")}>
          ← Back
        </span>
      </div>
    </div>
  );
};

export default OtpField;
