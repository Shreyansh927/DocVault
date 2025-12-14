import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
  });
  const [value, setValue] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    setValue(true);
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/signup",
        {
          name: form.name,
          email: form.email,
          password: form.password,
          phoneNumber: form.phoneNumber,
        },
        { withCredentials: true }
      );

      alert(res.data.message);
      setValue(false);
      navigate("/login");
    } catch (err) {
      console.log(err);
      alert(err);
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
          background: "linear-gradient(135deg,#6366f1,#06b6d4)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Create account</h2>
          <p>Join SafeCloud.</p>
        </div>
      </div>
      <div
        style={{
          padding: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="card" style={{ width: 380 }}>
          <h2>Sign up</h2>
          <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
            <input
              className="input"
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <input
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
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
              type="text"
              placeholder="Phone Number"
              value={form.phoneNumber}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value })
              }
              required
            />
            <button className="glow-btn" type="submit">
              {!value ? "create account" : "creating"}
            </button>
            <p>
              Already have an account{" "}
              <span onClick={() => navigate("/login")}>LOGIN</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
