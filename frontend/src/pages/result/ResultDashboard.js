import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function ResultDashboard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/results/latest")
      .then(res => {
        const r = res.data;
        if (r) {
          setResult({
            winnerTeam: r.winning_team,
            publishedAt: r.published_at ? new Date(r.published_at).toLocaleString() : null,
            debateTitle: r.debate_title,
            teamPair: r.team_pair,
            averageRating: r.average_rating
          });
        } else {
          setResult(null);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || "Failed to load result");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="content">
      <h2>Final Result</h2>

      {loading ? (
        <p style={{ marginTop: "20px" }}>Loading...</p>
      ) : error ? (
        <p style={{ marginTop: "20px", color: "#c00" }}>{error}</p>
      ) : !result ? (
        <p style={{ marginTop: "20px" }}>
          Winner appears ONLY after admin finalizes.
        </p>
      ) : (
        <div className="debate-card">
          <h3>Best Performing Team</h3>

          <p>
            <b>Team:</b> {result.winnerTeam}
          </p>

          {result.debateTitle && (
            <p>
              <b>Debate:</b> {result.debateTitle}
            </p>
          )}

          {result.averageRating != null && (
            <p>
              <b>Average Rating:</b> {Number(result.averageRating).toFixed(2)}
            </p>
          )}

          <p>
            <b>Published At:</b> {result.publishedAt}
          </p>
        </div>
      )}
    </div>
  );
}
