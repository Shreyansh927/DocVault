import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ResetEmail = () => {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  useEffect(() => {}, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:4000/api/forgot/reset-password",
        { email },
        { withCredentials: true }
      );
      alert(res.data.message);
      navigate("/otp-field");
      localStorage.setItem("current-user-email", JSON.stringify(email));
    } catch (err) {
      console.log(err);
      alert(err);
    }
  };
  return (
    <div>
      <p>Reset email</p>
      <form onSubmit={submit}>
        <input
          type="email"
          placeholder="Enter new email"
          required
          value={email}
          onChange={(E) => setEmail(E.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default ResetEmail;
