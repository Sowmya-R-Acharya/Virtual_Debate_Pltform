import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function CreateDebate() {
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [duration, setDuration] = useState("");
  const [debates, setDebates] = useState([]);
  const [teams, setTeams] = useState([]);

  const loadDebates = async () => {
    try {
      const res = await api.get("/debates");
      setDebates(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Load debates failed:", err);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await api.get("/teams");
      setTeams(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Load teams failed:", err);
    }
  };

  useEffect(() => {
    loadDebates();
    loadTeams();
  }, []);

  const handleCreate = async () => {
    if (!title || !topic || !team1 || !team2 || !duration) {
      alert("Please fill all fields");
      return;
    }

    if (team1 === team2) {
      alert("Please choose two different teams");
      return;
    }

    try {
      await api.post("/debates/create", {
        title,
        topic,
        teamPair: `${team1} vs ${team2}`,
        date: today,
        duration
      });

      setTitle("");
      setTopic("");
      setTeam1("");
      setTeam2("");
      setDuration("");
      loadDebates();
    } catch (err) {
      console.error("Create failed:", err);
      alert(err.response?.data?.message || "Failed to create debate");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this debate?")) {
      return;
    }

    try {
      await api.delete(`/debates/${id}`);
      loadDebates();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="content create-debate-content">
      <h2>Create Debate</h2>

      <div className="form-row create-debate-form">
        <input
          placeholder="Debate Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          placeholder="Debate Topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <select value={team1} onChange={(e) => setTeam1(e.target.value)}>
          <option value="">Select Team 1</option>
          {teams.map((team) => (
            <option key={team.id} value={team.name}>{team.name}</option>
          ))}
        </select>

        <select value={team2} onChange={(e) => setTeam2(e.target.value)}>
          <option value="">Select Team 2</option>
          {teams.map((team) => (
            <option key={team.id} value={team.name}>{team.name}</option>
          ))}
        </select>

        <input type="date" value={today} readOnly />

        <input
          type="number"
          placeholder="Duration (minutes)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />

        <button type="button" onClick={handleCreate}>Create</button>
      </div>

      <hr />

      {debates.length === 0 && <p>No debates created yet.</p>}

      <div className="create-debate-list">
        {debates.map((debate) => (
          <div key={debate.id} className="debate-card">
            <h3>{debate.title}</h3>
            <p><b>Topic:</b> {debate.topic || "No topic assigned"}</p>
            <p><b>Teams:</b> {debate.team_pair}</p>
            <p><b>Date:</b> {debate.debate_date || debate.date}</p>
            <p><b>Duration:</b> {debate.duration} min</p>
            <p><b>Status:</b> {debate.status}</p>

            <button
              type="button"
              className="delete-btn"
              onClick={() => handleDelete(debate.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
