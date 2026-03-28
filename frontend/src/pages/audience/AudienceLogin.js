import React, { useState } from "react";
import "../../styles/auth.css";

const SLOTS = ["aud1", "aud2", "aud3", "aud4", "aud5"];

export default function AudienceLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slot, setSlot] = useState("");

  const handleLogin = async () => {
    if (!email || !password || !slot) {
      alert("All fields are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role: "AUDIENCE",
          slot
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        window.location = "/audience/dashboard";
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Audience Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select value={slot} onChange={(e) => setSlot(e.target.value)}>
          <option value="">Select Slot</option>
          {SLOTS.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}
