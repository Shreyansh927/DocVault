import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./signup.css";
import { useEffect } from "react";
import Cookies from "js-cookie";

export default function Signup() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("accessToken");
    if (token) navigate("/home");
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/signup`,
        {
          name: form.name,
          email: form.email,
          password: form.password,
          phoneNumber: form.phoneNumber,
        },
        { withCredentials: true }
      );

      alert(res.data.message);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-page">
      <div className="signup-left">
        <div className="signup-left-content">
          <h2>Create your account</h2>
          <p>
            Securely store, manage, and access your files anywhere with
            SafeCloud.
          </p>
        </div>
      </div>

      <div className="signup-right">
        <div className="card">
          <h2>Sign up</h2>
          <p>Create your SafeCloud account</p>

          <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

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

            <input
              className="input"
              placeholder="Phone number"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value })
              }
              required
            />

            <button className="glow-btn" type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p>
              Already have an account?{" "}
              <span onClick={() => navigate("/login")}>Login</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
