import React, { useEffect, useState } from "react";
import Timer from "../../components/Timer";
import "../../styles/dashboard.css";

export default function StartDebate() {
  const [debate, setDebate] = useState(null);

  useEffect(() => {
    const storedDebate = localStorage.getItem("currentDebate");
    if (storedDebate) {
      setDebate(JSON.parse(storedDebate));
    }
  }, []);

  if (!debate) {
    return (
      <div className="content">
        <h3>No debate available. Admin has not created a debate yet.</h3>
      </div>
    );
  }

  return (
    <div className="content">
      <h2>Debate Started</h2>

      <div className="debate-card">
        <h3>{debate.title}</h3>
        <p><strong>Teams:</strong> {debate.teamPair}</p>
        <p><strong>Date:</strong> {debate.date}</p>

        <Timer minutes={parseInt(debate.duration)} />
      </div>
    </div>
  );
}
