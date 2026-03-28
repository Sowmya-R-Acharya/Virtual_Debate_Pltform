import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";

const API = "http://localhost:5000/api/teams";
const PREDEFINED_TEAMS = [
  "Team Alpha",
  "Team Beta",
  "Team Gamma",
  "Team Delta",
  "Team Sigma",
  "Team Omega",
  "Team Phoenix",
  "Team Titan",
  "Team Orion",
  "Team Nova"
];

export default function CreateTeam() {
  const [name, setName] = useState("");
  const [teams, setTeams] = useState([]);

  const loadTeams = async () => {
    try {
      const res = await fetch(API);
      if (res.ok) {
        const data = await res.json();
        setTeams(Array.isArray(data) ? data : []);
      } else {
        console.error("Failed to load teams:", res.status);
        setTeams([]);
      }
    } catch (err) {
      console.error("Load teams failed:", err);
      setTeams([]);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const existingTeamNames = new Set(
    teams.map((team) => String(team.name || "").trim().toLowerCase())
  );

  const availablePredefinedTeams = PREDEFINED_TEAMS.filter(
    (teamName) => !existingTeamNames.has(teamName.toLowerCase())
  );

  const createTeam = async (teamName) => {
    const trimmedName = String(teamName || "").trim();
    if (!trimmedName) {
      alert("Please enter a team name");
      return false;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login as admin");
      return false;
    }

    try {
      const res = await fetch(`${API}/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: trimmedName })
      });

      if (!res.ok) {
        alert("Team creation failed");
        return false;
      }

      await loadTeams();
      return true;
    } catch (err) {
      console.error("Create failed:", err);
      return false;
    }
  };

  const handleCreate = async () => {
    const created = await createTeam(name);
    if (created) {
      setName("");
    }
  };

  const handleAddPredefined = async (teamName) => {
    await createTeam(teamName);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this team?")) return;

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login as admin");
      return;
    }

    try {
      const res = await fetch(`${API}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        loadTeams();
      } else {
        alert("Team deletion failed");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="content create-team-content">
      <h2>Create Team</h2>

      <div className="form-row">
        <input
          placeholder="Team Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <button onClick={handleCreate}>Create</button>
      </div>

      <hr />

      <h3>Predefined Teams</h3>
      {availablePredefinedTeams.length === 0 && <p>All predefined teams are already added.</p>}
      <div className="btn-row">
        {availablePredefinedTeams.map((teamName) => (
          <button
            key={teamName}
            type="button"
            onClick={() => handleAddPredefined(teamName)}
          >
            {teamName}
          </button>
        ))}
      </div>

      <hr />

      {teams.length === 0 && <p>No teams created yet.</p>}

      <div className="create-team-list">
        {teams.map((team) => (
          <div key={team.id} className="create-team-card">
            <h3>{team.name}</h3>
            <button
              className="delete-btn"
              onClick={() => handleDelete(team.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
