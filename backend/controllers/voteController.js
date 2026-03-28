const voteModel = require("../models/voteModel");

const vote = (req, res) => {
  const { debate_id, team_voted, team_name, rating, comment, voice_audio, voice_transcript, voice_message } = req.body;
  const user_id = req.user.id; // from JWT

  const normalizedTeam = team_voted || team_name;

  if (!debate_id || !normalizedTeam || !rating) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  let normalizedVoiceAudio = voice_audio || null;
  let normalizedVoiceTranscript = voice_transcript || null;

  if (!normalizedVoiceAudio && !normalizedVoiceTranscript && voice_message) {
    if (typeof voice_message === "string" && voice_message.startsWith("data:audio")) {
      normalizedVoiceAudio = voice_message;
    } else {
      normalizedVoiceTranscript = voice_message;
    }
  }

  // Check if user already voted for this debate
  voteModel.checkUserVote(debate_id, user_id, (err, hasVoted) => {
    if (err) return res.status(500).json({ message: "Error checking vote" });
    if (hasVoted) return res.status(400).json({ message: "You have already voted for this debate" });

    const voteData = {
      debate_id,
      user_id,
      team_voted: normalizedTeam,
      team_name: normalizedTeam,
      rating,
      comment,
      voice_audio: normalizedVoiceAudio,
      voice_transcript: normalizedVoiceTranscript,
      voice_message: normalizedVoiceTranscript || normalizedVoiceAudio || null
    };
    voteModel.submitVote(voteData, (err) => {
      if (err) {
        console.error("VOTE SUBMIT ERROR:", err);
        return res.status(500).json({ message: "Vote submission failed" });
      }
      res.json({ message: "Vote submitted successfully" });
    });
  });
};

const getVotes = (req, res) => {
  voteModel.getAllVotes((err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch votes" });
    }
    res.json(rows);
  });
};

const getVotesByDebate = (req, res) => {
  const debateId = req.params.id;
  voteModel.getVotesByDebate(debateId, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: "Failed to fetch votes" });
    }
    res.json(rows);
  });
};

const deleteVote = (req, res) => {
  const voteId = req.params.id;
  // Assuming we add deleteVote to model
  voteModel.deleteVote(voteId, (err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to delete vote" });
    }
    res.json({ message: "Vote deleted" });
  });
};

module.exports = {
  vote,
  getVotes,
  getVotesByDebate,
  deleteVote
};
