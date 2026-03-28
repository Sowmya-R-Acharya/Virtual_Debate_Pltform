import React, { useState, useEffect } from "react";
import "../../styles/auth.css";
import { useNavigate } from "react-router-dom";

export default function DebaterRegister() {

  const navigate = useNavigate();
  const [teamPair, setTeamPair] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teams, setTeams] = useState([]);

  /* ✅ Load teams */
  const loadTeams = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/teams");
      const data = await res.json();
      setTeams(data);
    } catch (err) {
      console.error("Load teams failed:", err);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const handleRegister = async () => {
    if (!teamPair || !email || !password) {
      alert("All fields are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: email, // Using email as name for simplicity
          email,
          password,
          role: "DEBATER",
          team_name: teamPair
        })
      });
      const data = await res.json();

      if (res.ok) {
        // Already-registered user flow: backend returns token and user
        if (data.token) {
          localStorage.setItem("token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          alert(data.message || "Logged in successfully");
          navigate("/debater/dashboard");
          return;
        }

        alert(data.message || "Debater Registered Successfully");
        navigate("/debater/login");
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (err) {
      console.error("Register failed:", err);
      alert("An error occurred during registration");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Debater Register</h2>

        <select
          value={teamPair}
          onChange={(e) => setTeamPair(e.target.value)}
        >
          <option value=""> (select team)</option>
          {teams.map((team) => (
            <option key={team.id} value={team.name}>
              {team.name}
            </option>
          ))}
        </select>

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

        <button onClick={handleRegister}>Register</button>
      </div>
    </div>
  );
}
