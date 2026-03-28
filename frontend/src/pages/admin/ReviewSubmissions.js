import React, { useEffect, useState } from "react";
import "../../styles/dashboard.css";
const API = "http://localhost:5000/api/submission";

export default function ReviewSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const endpoint = showAll ? `${API}/all` : API;
    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubmissions(data);
        } else {
          setSubmissions([]);
        }
      })
      .catch(err => {
        console.error(err);
        setSubmissions([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [showAll]);

  const renderTranscript = (voiceTranscript) => {
    if (!voiceTranscript) return null;

    if (typeof voiceTranscript === "string") {
      try {
        const parsed = JSON.parse(voiceTranscript);
        if (Array.isArray(parsed)) {
          return (
            <div className="voice-message-list">
              {parsed.map((msg, idx) => (
                <div key={idx} className="voice-message-item">
                  <strong>{msg.userName || "User"}:</strong> {msg.message || ""}
                  {msg.timestamp && (
                    <span className="voice-message-meta">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        }
      } catch (e) {
        // fall through to render raw text
      }
    }

    return <div className="voice-message-item">{voiceTranscript}</div>;
  };

  const handleApprove = (id) => {
    fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Approve request failed");
        }
        setSubmissions(prev => prev.map(s =>
          (s.submission_id || s.id) === id ? { ...s, submission_status: 'APPROVED' } : s
        ));
      })
      .catch(err => console.error('Failed to approve submission', err));
  };

  const handleReject = (id) => {
    fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REJECTED' })
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Reject request failed");
        }
        setSubmissions(prev => prev.map(s =>
          (s.submission_id || s.id) === id ? { ...s, submission_status: 'REJECTED' } : s
        ));
      })
      .catch(err => console.error('Failed to reject submission', err));
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'SUBMITTED': { bg: '#f39c12', color: '#fff' },
      'APPROVED': { bg: '#27ae60', color: '#fff' },
      'REJECTED': { bg: '#e74c3c', color: '#fff' }
    };
    const style = statusColors[status] || { bg: '#95a5a6', color: '#fff' };
    return (
      <span style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold'
      }}>
        {status}
      </span>
    );
  };

  const pendingCount = submissions.filter(s => s.submission_status === 'SUBMITTED').length;

  return (
    <div className="content">
      <div className="header-row">
        <h2>Review Submissions</h2>
        <button 
          className="btn-toggle"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "Show Pending Only" : "Show All Submissions"}
        </button>
      </div>

      {showAll && (
        <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>
          Showing all submissions (past and pending)
        </p>
      )}

      {!showAll && pendingCount > 0 && (
        <p style={{ color: '#f39c12', marginBottom: '20px' }}>
          {pendingCount} pending submission{pendingCount !== 1 ? 's' : ''} awaiting review
        </p>
      )}

      {loading && <p>Loading submissions...</p>}

      {!loading && submissions.length === 0 && (
        <p>No submitted debates yet</p>
      )}

      {!loading && submissions.map((submission) => {
        const isPending = submission.submission_status === 'SUBMITTED';
        
        return (
          <div 
            key={submission.submission_id || submission.id} 
            className={`submission-card ${!isPending ? 'past-submission' : ''}`}
          >
            <div className="submission-header">
              <h3>{submission.title}</h3>
              {getStatusBadge(submission.submission_status)}
            </div>
            
            <div className="submission-details">
              <p><b>Team:</b> {submission.team_name}</p>
              <p><b>Team Pair:</b> {submission.team_pair}</p>
              <p><b>Date:</b> {submission.debate_date}</p>
              <p><b>Assigned Duration:</b> {submission.duration} min</p>
              <p><b>Performed Minutes:</b> {submission.performed_minutes}</p>
              <p><b>Submitted At:</b> {new Date(submission.submitted_at).toLocaleString()}</p>
            </div>

            {(submission.voice_audio || submission.voice_transcript || submission.voice_message) && (
              <div className="voice-message">
                <div className="voice-message-header">Voice/Audio Content</div>
                {(submission.voice_audio ||
                  (typeof submission.voice_message === "string" &&
                    submission.voice_message.startsWith("data:audio"))) && (
                  <div className="voice-message-audio">
                    <audio
                      controls
                      src={
                        submission.voice_audio ||
                        submission.voice_message
                      }
                    />
                  </div>
                )}
                {renderTranscript(
                  submission.voice_transcript ||
                    (typeof submission.voice_message === "string" &&
                    submission.voice_message.startsWith("data:audio")
                      ? null
                      : submission.voice_message)
                )}
              </div>
            )}

            {isPending && (
              <div className="btn-row">
                <button 
                  className="btn-approve" 
                  onClick={() => handleApprove(submission.submission_id || submission.id)}
                >
                  Approve
                </button>
                <button 
                  className="btn-reject" 
                  onClick={() => handleReject(submission.submission_id || submission.id)}
                >
                  Reject
                </button>
              </div>
            )}

            {!isPending && (
              <div className="past-badge">
                {submission.submission_status === 'APPROVED' ? '✓ Approved' : '✗ Rejected'}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .btn-toggle {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-toggle:hover {
          background: #2980b9;
        }
        
        .submission-card {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .past-submission {
          background: #f8f9fa;
          border-left: 4px solid #95a5a6;
        }
        
        .submission-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .submission-header h3 {
          margin: 0;
          color: #2c3e50;
        }
        
        .submission-details {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .submission-details p {
          margin: 5px 0;
          color: #555;
        }
        
        .voice-message {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 8px;
          margin-top: 15px;
        }
        
        .voice-message-header {
          font-weight: bold;
          margin-bottom: 10px;
          color: #2c3e50;
        }
        
        .voice-message-audio {
          margin-bottom: 15px;
        }
        
        .voice-message-audio audio {
          width: 100%;
          max-width: 400px;
        }
        
        .voice-message-list {
          margin-top: 10px;
        }
        
        .voice-message-item {
          padding: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .voice-message-item:last-child {
          border-bottom: none;
        }
        
        .btn-row {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }
        
        .btn-approve {
          background: #27ae60;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-approve:hover {
          background: #219a52;
        }
        
        .btn-reject {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .btn-reject:hover {
          background: #c0392b;
        }
        
        .past-badge {
          margin-top: 15px;
          padding: 8px 16px;
          background: #95a5a6;
          color: white;
          border-radius: 4px;
          display: inline-block;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}

