import React, { useState } from "react";
import { socket } from "../../socket";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");

    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/login",
        {
          email: form.email.trim(),
          password: form.password,
        },
        { withCredentials: true }
      );

      // ✅ user is guaranteed now
      const user = res.data.user;

      localStorage.setItem("current-user", JSON.stringify(user));

      // socket registration
      socket.emit("register", user.id);

      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your SafeCloud account</p>

          <form onSubmit={submit} className="login-form">
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />

            {error && <p className="error-text">{error}</p>}

            <button className="glow-btn" type="submit" disabled={processing}>
              {processing ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="login-links">
            <span onClick={() => navigate("/reset-email")}>
              Forgot password?
            </span>
            <p>
              New here? <Link to="/signup">Create an account</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-brand">
          <h1>SafeCloud</h1>
          <p>Secure cloud storage for your files.</p>
        </div>
      </div>
    </div>
  );
}
