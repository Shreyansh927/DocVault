import React, { useState, useEffect } from "react";
import axios from "axios";
import { Navigate, useNavigate } from "react-router-dom";
import "./login.css";

import { toast } from "react-toastify";
import { GoogleLogin } from "@react-oauth/google";
import api from "../../api-interceptor";

export default function Login() {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const [isAuth, setIsAuth] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // const controller = new AbortController();

    api
      .get("/api/auth/me")
      .then(() => setIsAuth(true))
      .catch(() => setIsAuth(false));

    if (window.location.pathname === "/login") {
      const f = async () => {
        await api.get("/api/auth/refresh");
      };

      f();
    }

    // return () => controller.abort();
  }, [isAuth]);

  if (isAuth) {
    navigate("/home");
  }

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async (credentialResponse) => {
    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/google`,
        {
          credential: credentialResponse.credential,
        },
        {
          withCredentials: true,
        },
      );

      localStorage.setItem("current-user", JSON.stringify(res.data.user));

      toast.success("Google login successful");

      navigate("/home");
    } catch (err) {
      toast.error(err.response?.data?.error || "Google login failed");
    }
  };

  // useEffect(() => {
  //   const checkAuth = async () => {
  //     try {
  //       await axios.get(`${API_BASE_URL}/api/auth/me`, {
  //         withCredentials: true,
  //       });
  //       navigate("/home", { replace: true });
  //     } catch {
  //       // Not logged in → stay on login page
  //     }
  //   };

  //   checkAuth();
  // }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError("");

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        {
          email: form.email.trim(),
          password: form.password,
        },
        { withCredentials: true },
      );
      const user = res.data.user;

      localStorage.setItem("current-user", JSON.stringify(user));

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
          <p>Sign in to your Docvault account</p>

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

          <div
            style={{
              marginTop: "20px",
              display: "flex",
              justifyContent: "center",
            }}
            className="google-login-button"
          >
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => {
                toast.error("Google login failed");
              }}
              useOneTap={false}
            />
          </div>

          <div className="login-links">
            <span onClick={() => navigate("/reset-email")}>
              Forgot password?
            </span>
            <p>
              New here?{" "}
              <span onClick={() => navigate("/signup")}>Create an account</span>
            </p>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-brand">
          <h1>DocVault</h1>
          <p>Secure cloud storage for your files.</p>
        </div>
      </div>
    </div>
  );
}
