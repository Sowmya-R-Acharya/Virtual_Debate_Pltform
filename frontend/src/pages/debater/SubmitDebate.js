import React, { useState, useEffect, useRef } from "react";
import "../../styles/dashboard.css";

const API = "http://localhost:5000/api/submission/submit";

export default function SubmitDebate() {
  const [debates, setDebates] = useState([]);
  const [selectedDebate, setSelectedDebate] = useState("");
  const [teamName, setTeamName] = useState("");
  const [debateText, setDebateText] = useState("");
  const [performedMinutes, setPerformedMinutes] = useState(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [voiceMessage, setVoiceMessage] = useState("");
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const userId = localStorage.getItem("user_id");

  useEffect(() => {
    // Fetch available debates
    fetch("http://localhost:5000/api/debates")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setDebates(data);
        }
      })
      .catch(err => console.error("Error fetching debates:", err));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudio(audioBlob);
        setAudioUrl(url);
        
        // Convert to base64 for submission
        const reader = new FileReader();
        reader.onloadend = () => {
          setVoiceMessage(reader.result);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setStartTime(new Date().toISOString());
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setEndTime(new Date().toISOString());
      
      // Calculate performed minutes
      if (startTime) {
        const start = new Date(startTime);
        const end = new Date();
        const minutes = Math.round((end - start) / 60000);
        setPerformedMinutes(minutes);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDebate || !teamName || !debateText) {
      alert("Please fill in all required fields");
      return;
    }

    const submissionData = {
      debate_id: selectedDebate,
      user_id: userId,
      team_name: teamName,
      start_time: startTime,
      end_time: endTime || new Date().toISOString(),
      performed_minutes: performedMinutes,
      voice_audio: voiceMessage,
      voice_transcript: debateText
    };

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      if (response.ok) {
        alert("Debate submitted successfully!");
        // Reset form
        setSelectedDebate("");
        setTeamName("");
        setDebateText("");
        setPerformedMinutes(0);
        setStartTime("");
        setEndTime("");
        setRecordedAudio(null);
        setAudioUrl(null);
        setVoiceMessage("");
      } else {
        const data = await response.json();
        alert("Failed to submit: " + data.message);
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert("Error submitting debate");
    }
  };

  const clearRecording = () => {
    setRecordedAudio(null);
    setAudioUrl(null);
    setVoiceMessage("");
    setPerformedMinutes(0);
  };

  return (
    <div className="content">
      <h2>Submit Debate</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Debate:</label>
          <select 
            value={selectedDebate} 
            onChange={(e) => setSelectedDebate(e.target.value)}
            required
          >
            <option value="">-- Select a Debate --</option>
            {debates.map((debate) => (
              <option key={debate.id} value={debate.id}>
                {debate.title} - {debate.team_pair}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Team Name:</label>
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
            required
          />
        </div>

        <div className="form-group">
          <label>Debate Content:</label>
          <textarea
            rows="8"
            value={debateText}
            onChange={(e) => setDebateText(e.target.value)}
            placeholder="Enter your debate argument..."
            required
          />
        </div>

        <div className="form-group">
          <label>Voice Recording:</label>
          <div className="voice-recorder">
            {!isRecording && !recordedAudio && (
              <button type="button" onClick={startRecording} className="btn-record">
                🎤 Start Recording
              </button>
            )}
            
            {isRecording && (
              <button type="button" onClick={stopRecording} className="btn-stop">
                ⏹ Stop Recording
              </button>
            )}
            
            {audioUrl && (
              <div className="audio-preview">
                <audio controls src={audioUrl} />
                <button type="button" onClick={clearRecording} className="btn-clear">
                  Clear Recording
                </button>
              </div>
            )}
            
            {isRecording && <div className="recording-indicator">🔴 Recording...</div>}
            
            {performedMinutes > 0 && (
              <p className="duration-info">Recorded Duration: {performedMinutes} minutes</p>
            )}
          </div>
        </div>

        <button type="submit" className="btn-submit">
          Submit Debate
        </button>
      </form>

      <style>{`
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .voice-recorder {
          padding: 15px;
          background: #f5f5f5;
          border-radius: 8px;
        }
        
        .btn-record {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-stop {
          background: #c0392b;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-clear {
          background: #95a5a6;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          margin-left: 10px;
        }
        
        .btn-submit {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          width: 100%;
        }
        
        .audio-preview {
          margin-top: 15px;
        }
        
        .audio-preview audio {
          width: 100%;
          margin-bottom: 10px;
        }
        
        .recording-indicator {
          color: #e74c3c;
          font-weight: bold;
          margin-top: 10px;
        }
        
        .duration-info {
          margin-top: 10px;
          color: #27ae60;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
