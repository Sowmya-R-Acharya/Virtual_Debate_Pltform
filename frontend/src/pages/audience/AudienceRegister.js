import React, { useState } from "react";
import "../../styles/auth.css";

const SLOTS = ["aud1", "aud2", "aud3", "aud4", "aud5"];

export default function AudienceRegister() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slot, setSlot] = useState("");

  const handleRegister = async () => {
    if (!name || !email || !password || !slot) {
      alert("All fields are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: "AUDIENCE",
          slot
        })
      });

      if (res.ok) {
        alert("Registered successfully");
        window.location = "/audience/login";
      } else {
        let message = "Registration failed";
        try {
          const data = await res.json();
          if (data && data.message) message = data.message;
        } catch (_) {}
        alert(message);
      }
    } catch (err) {
      console.error("Register failed:", err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Audience Register</h2>

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
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

        <button onClick={handleRegister}>Register</button>
      </div>
    </div>
  );
}
