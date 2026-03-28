import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
import api from "../../services/api";

export default function VoteDebate() {
  const [approvedDebates, setApprovedDebates] = useState([]);
  const [selectedDebate, setSelectedDebate] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recognitionRef = React.useRef(null);

  // Load ONLY approved debates
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const role = typeof user?.role === "string" ? user.role.toUpperCase() : "";

    if (!token || role !== "AUDIENCE") {
      alert("Audience login is required to vote.");
      window.location = "/audience/login";
      return;
    }

    api.get("/debates")
      .then(res => {
        const approved = res.data.filter(d => d.status === "APPROVED");
        setApprovedDebates(approved);
      })
      .catch(err => {
        if (err.response?.status === 401 || err.response?.status === 403) {
          alert("Your audience session is invalid or expired. Please login again.");
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location = "/audience/login";
          return;
        }
        console.error("Failed to fetch debates", err);
      });

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setVoiceTranscript(finalTranscript + interimTranscript);
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current = recognitionInstance;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSelectDebate = (id) => {
    const debate = approvedDebates.find(d => d.id === Number(id));
    setSelectedDebate(debate);
  };

  const handleSubmit = () => {
    if (!selectedDebate || !selectedTeam || !rating) {
      alert("Please select a debate, team, and provide a rating");
      return;
    }

    const vote = {
      debate_id: selectedDebate.id,
      team_voted: selectedTeam,
      rating: parseInt(rating),
      comment,
      voice_transcript: voiceTranscript,
      voice_message: voiceTranscript
    };

    api.post("/votes/submit", vote)
      .then(() => {
        alert("Vote submitted successfully");
        setSelectedTeam("");
        setRating("");
        setComment("");
        setVoiceTranscript("");
      })
      .catch(err => {
        alert(err.response?.data?.message || "Vote submission failed");
      });
  };

  return (
    <div className="content">
      <h2>Vote for Debate</h2>

      <label>Approved Debates</label>
      <select onChange={(e) => handleSelectDebate(e.target.value)}>
        <option value="">Select Debate</option>
        {approvedDebates.map(d => (
          <option key={d.id} value={d.id}>
            {d.title} ({d.team_pair || d.teamPair})
          </option>
        ))}
      </select>

      {selectedDebate && (
        <div className="debate-card">
          <p><b>Title:</b> {selectedDebate.title}</p>
          <p><b>Teams:</b> {selectedDebate.team_pair || selectedDebate.teamPair}</p>
          <p><b>Date:</b> {selectedDebate.debate_date || selectedDebate.date}</p>
          <p><b>Duration:</b> {selectedDebate.duration || "-"} min</p>
          <p><b>Status:</b> {selectedDebate.status}</p>
        </div>
      )}

      {selectedDebate && (
        <>
          <label>Select Team to Vote For</label>
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="">Select Team</option>
            {(selectedDebate.team_pair || selectedDebate.teamPair || "")
              .split(" vs ")
              .filter(Boolean)
              .map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>

          <label>Rating (1 to 5)</label>
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">Select Rating</option>
            {[1,2,3,4,5].map(r => (
              <option key={r}>{r}</option>
            ))}
          </select>

          <label>Comment</label>
          <textarea
            rows="4"
            placeholder="Your feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />

          <button onClick={handleSubmit}>Submit Vote</button>
        </>
      )}
    </div>
  );
}
