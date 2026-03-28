import React from "react";
import "../../styles/auth.css";

export default function ProjectLogin() {
  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>Virtual Debate Platform</h2>

        <input
          type="email"
          placeholder="Enter Email"
        />

        <input
          type="password"
          placeholder="Enter Password"
        />

        <button onClick={() => window.location = "/dashboard-select"}>
          Login
        </button>
      </div>
    </div>
  );
}
