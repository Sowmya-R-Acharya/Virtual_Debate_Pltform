import React, { useEffect, useState } from "react";
import "../../styles/auth.css";
import { useNavigate } from "react-router-dom";

export default function DebaterLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Load teams failed:", err));
  }, []);

  const handleLogin = async () => {
    if (!email || !password || !teamName) {
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
          role: "DEBATER",
          team_name: teamName
        })
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/debater/dashboard");
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Debater Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select value={teamName} onChange={(e) => setTeamName(e.target.value)}>
          <option value="">Select Team</option>
          {teams.map((team) => (
            <option key={team.id} value={team.name}>
              {team.name}
            </option>
          ))}
        </select>

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}
