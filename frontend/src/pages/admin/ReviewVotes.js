import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function ReviewVotes() {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadVotes = (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) {
      setLoading(true);
    }

    api.get("/votes")
      .then((res) => {
        setVotes(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          alert("Your admin session is invalid or expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location = "/admin/login";
          return;
        }
        console.error("Failed to fetch votes", err);
        if (!isBackgroundRefresh) {
          setVotes([]);
        }
      })
      .finally(() => {
        if (!isBackgroundRefresh) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = typeof user?.role === "string" ? user.role.toUpperCase() : "";

    if (!token || role !== "ADMIN") {
      alert("Admin login is required to review votes.");
      window.location = "/admin/login";
      return;
    }

    loadVotes(false);

    const refreshTimer = window.setInterval(() => {
      loadVotes(true);
    }, 10000);

    const handleFocus = () => {
      loadVotes(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const voteCounts = votes.reduce((summary, vote) => {
    const teamName = String(vote.team_voted || "").trim();
    if (!teamName) {
      return summary;
    }

    summary[teamName] = (summary[teamName] || 0) + 1;
    return summary;
  }, {});

  const highestVotedEntry = Object.entries(voteCounts).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  })[0];

  return (
    <div className="content">
      <h2>Audience Votes</h2>

      {loading && <p>Loading votes...</p>}

      {!loading && votes.length === 0 && (
        <p style={{ marginTop: "20px" }}>No votes submitted by audience yet.</p>
      )}

      {!loading && highestVotedEntry && (
        <div className="submission-card">
          <div className="submission-details">
            <p><b>Highest Voted Team:</b> {highestVotedEntry[0]}</p>
          </div>
        </div>
      )}
    </div>
  );
}
