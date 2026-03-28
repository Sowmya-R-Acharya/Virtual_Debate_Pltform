import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function FinalizeResult() {
  const [debates, setDebates] = useState([]);
  const [selectedDebate, setSelectedDebate] = useState(null);
  const [audienceSummary, setAudienceSummary] = useState([]);
  const [winnerPreview, setWinnerPreview] = useState(null);
  const [averageRating, setAverageRating] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const loadAudienceEvaluation = (debateId, isBackgroundRefresh = false) => {
    if (!debateId) {
      return;
    }

    api.get(`/results/evaluate/${debateId}`)
      .then(res => {
        setAudienceSummary(Array.isArray(res.data?.audience_summary) ? res.data.audience_summary : []);
        setWinnerPreview(res.data?.winning_team || null);
        setAverageRating(res.data?.average_rating ?? null);
        setLastUpdatedAt(new Date());
      })
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          alert("Only admins can view votes. Please login as admin.");
          window.location = "/admin/login";
          return;
        }
        if (!isBackgroundRefresh) {
          console.error("Failed to evaluate result", err);
        }
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = typeof user?.role === "string" ? user.role.toUpperCase() : "";

    if (!token || role !== "ADMIN") {
      alert("Admin login is required to finalize results.");
      window.location = "/admin/login";
      return;
    }

    api.get("/debates")
      .then(res => setDebates(res.data))
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          alert("Your admin session is invalid or expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location = "/admin/login";
          return;
        }
        console.error("Failed to fetch debates", err);
      });
  }, []);

  const handleSelectDebate = (id) => {
    const debate = debates.find(d => d.id === Number(id));
    setSelectedDebate(debate);
    setAudienceSummary([]);
    setWinnerPreview(null);
    setAverageRating(null);

    if (!id || !debate) {
      return;
    }

    loadAudienceEvaluation(id, false);
  };

  useEffect(() => {
    if (!selectedDebate?.id) {
      return undefined;
    }

    const refreshTimer = window.setInterval(() => {
      loadAudienceEvaluation(selectedDebate.id, true);
    }, 10000);

    const handleFocus = () => {
      loadAudienceEvaluation(selectedDebate.id, true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, [selectedDebate]);

  const handleFinalize = () => {
    if (!selectedDebate) return;

    if (audienceSummary.length === 0 || !winnerPreview) {
      alert("No votes available to finalize the result.");
      return;
    }

    api.post("/results/publish", { debate_id: selectedDebate.id })
      .then((res) => {
        const publishedWinner = res.data?.winning_team || winnerPreview;
        const publishedAverage = res.data?.average_rating ?? averageRating;

        setWinnerPreview(publishedWinner);
        setAverageRating(publishedAverage);
        setAudienceSummary(Array.isArray(res.data?.audience_summary) ? res.data.audience_summary : audienceSummary);
        alert(`Result finalized: Winner is ${publishedWinner}`);
      })
      .catch(err => {
        alert(err.response?.data?.message || "Failed to publish result");
      });
  };

  return (
    <div className="content">
      <h2>Finalize Debate Results</h2>
      <div className="vote-toolbar">
        <span className="dashboard-user-meta">
          {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString()}` : "Waiting for votes"}
        </span>
        <button
          type="button"
          onClick={() => selectedDebate?.id && loadAudienceEvaluation(selectedDebate.id, false)}
          disabled={!selectedDebate?.id}
        >
          Refresh Audience Summary
        </button>
      </div>

      <label>Select Debate</label>
      <select onChange={(e) => handleSelectDebate(e.target.value)}>
        <option value="">Select Debate</option>
        {debates.map(d => (
          <option key={d.id} value={d.id}>
            {d.title} ({d.team_pair})
          </option>
        ))}
      </select>

      {selectedDebate && (
        <div className="debate-card">
          <h3>{selectedDebate.title}</h3>
          <p><b>Teams:</b> {selectedDebate.team_pair}</p>
          <p><b>Date:</b> {selectedDebate.debate_date}</p>
          <p><b>Status:</b> {selectedDebate.status}</p>
          <p><b>Winner Preview:</b> {winnerPreview || "Awaiting audience votes"}</p>
          <p><b>Overall Audience Rating:</b> {averageRating != null ? Number(averageRating).toFixed(2) : "-"}</p>

          <h4>Audience Decision Summary</h4>
          <p className="dashboard-subtitle">
            Final winner is based on audience rating plus comment sentiment. Higher ratings and
            more positive comments produce a stronger audience score.
          </p>
          {audienceSummary.length === 0 && (
            <p className="empty-state">No audience votes available for this debate yet.</p>
          )}
          {audienceSummary.map((team, index) => (
            <div key={index} className="vote-item">
              <p><b>Team:</b> {team.team || "(no team)"}</p>
              <p><b>Votes:</b> {team.voteCount}</p>
              <p><b>Avg Rating:</b> {team.averageRating != null ? Number(team.averageRating).toFixed(2) : "-"}</p>
              <p><b>Positive Comments:</b> {team.positiveComments}</p>
              <p><b>Negative Comments:</b> {team.negativeComments}</p>
              <p><b>Audience Score:</b> {team.audienceScore != null ? Number(team.audienceScore).toFixed(2) : "-"}</p>
            </div>
          ))}

          <button onClick={handleFinalize}>Finalize Result</button>
        </div>
      )}
    </div>
  );
}
