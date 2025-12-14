import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SetPassword = () => {
  const [password, setPassword] = useState("");
  const email = JSON.parse(localStorage.getItem("current-user-email"));
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:4000/api/forgot/set-new-password",
        {email, password },
        { withCredentials: true }
      );

      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      console.log(err);
      alert(err);
    }
  };
  return (
    <div>
      <h1>set new password</h1>
      <form onSubmit={submit}>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default SetPassword;
