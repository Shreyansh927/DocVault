import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useNavigate, Link } from "react-router-dom";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) navigate("/home");
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/login",
        {
          email: form.email,
          password: form.password,
        },
        { withCredentials: true }
      );

      localStorage.setItem("current-user-email", JSON.stringify(form.email));
      alert(res.data.message);
      navigate("/home");
    } catch (err) {
      console.error(err);
      alert("Invalid credentials");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="login-page">
      {/* ---------- Left (Form) ---------- */}
      <div className="login-left">
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your SafeCloud account</p>

          <form onSubmit={submit} className="login-form">
            <input
              className="input"
              placeholder="Email address"
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

      {/* ---------- Right (Brand) ---------- */}
      <div className="login-right">
        <div className="login-brand">
          <h1>SafeCloud</h1>
          <p>
            Secure cloud storage to organize, protect, and access your files
            anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
