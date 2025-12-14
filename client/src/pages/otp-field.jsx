import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const OtpField = () => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();

  const email = JSON.parse(localStorage.getItem("current-user-email"));

  if (!email) {
    return <p>Email not found. Please restart password reset.</p>;
  }

  const submit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:4000/api/forgot/verify-otp",
        { email, otp },
        { withCredentials: true }
      );

      alert(res.data.message);
      navigate("/set-new-password");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Invalid OTP");
    }
  };

  return (
    <div>
      <h2>Enter OTP</h2>

      <form onSubmit={submit}>
        <input
          type="text"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          placeholder="Enter OTP"
          required
        />

        <button type="submit">Verify OTP</button>
      </form>
    </div>
  );
};

export default OtpField;
