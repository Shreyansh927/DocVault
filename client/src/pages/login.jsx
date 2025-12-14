import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");

    if (token) {
      navigate("/home");
    }
  }, []);

  const submit = async (e) => {
    setProcessing(true);
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/login",
        {
          email: form.email,
          password: form.password,
        },
        { withCredentials: true }
      );

      alert(res.data.message);

      navigate("/home");
      setProcessing(false);
    } catch (err) {
      console.log(err);
      setProcessing(false);
      alert(err);
    } finally {
      localStorage.setItem("current-user-email", JSON.stringify(form.email));
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="card" style={{ width: 380 }}>
          <h2>Login</h2>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input
              className="input"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="input"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button className="glow-btn" type="submit">
              {processing ? " Logging in..." : "Login"}
            </button>
          </form>
          <p style={{ fontSize: 13, marginTop: 10 }}>
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>

          <p style={{ color: "red" }} onClick={() => navigate("/reset-email")}>
            Forgot password
          </p>
        </div>
      </div>
      <div
        style={{
          background: "linear-gradient(135deg,#06b6d4,#6366f1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>SafeCloud</h2>
          <p>Store your documents securely. Create folders and save files.</p>
        </div>
      </div>
    </div>
  );
}
