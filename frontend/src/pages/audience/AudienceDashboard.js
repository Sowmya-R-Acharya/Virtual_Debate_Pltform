import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function AudienceDashboard() {
  const [approvedDebates, setApprovedDebates] = useState([]);

  const links = [
    { label: "Approved Debates", path: "/audience/vote"}
  ];

  useEffect(() => {
    api.get("/debates")
      .then(res => {
        const approved = res.data.filter(d => d.status === "APPROVED");
        setApprovedDebates(approved);
      })
      .catch(err => console.error("Failed to fetch debates", err));
  }, []);

  return (
    <div className="dashboard">
      <Sidebar links={links} />

      <div className="content">
        <h2>Audience Dashboard</h2>
        <p>
          Only debates <b>approved by admin</b> are visible here.
        </p>

        <h3>Approved Debates</h3>
        {approvedDebates.length === 0 ? (
          <p>No approved debates available.</p>
        ) : (
          <div>
            {approvedDebates.map(debate => (
              <div key={debate.id} className="debate-card">
                <h4>{debate.title}</h4>
                <p><b>Teams:</b> {debate.team_pair}</p>
                <p><b>Date:</b> {debate.debate_date}</p>
                <p><b>Duration:</b> {debate.duration} min</p>
                <p><b>Status:</b> {debate.status}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
