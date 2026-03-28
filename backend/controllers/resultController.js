const resultModel = require("../models/resultModel");
const voteModel = require("../models/voteModel");
const { evaluateAudienceDecision } = require("../utils/audienceDecision");

function buildAudienceEvaluation(debateId, callback) {
  voteModel.getVoteDetailsByDebate(debateId, (err, rows) => {
    if (err) {
      callback(err);
      return;
    }

    const evaluation = evaluateAudienceDecision(Array.isArray(rows) ? rows : []);
    callback(null, evaluation);
  });
}

exports.publishResult = (req, res) => {
  const { debate_id } = req.body;

  if (!debate_id) {
    return res.status(400).json({ message: "Debate ID is required" });
  }

  buildAudienceEvaluation(debate_id, (evaluationErr, evaluation) => {
    if (evaluationErr) {
      console.error("Audience evaluation error:", evaluationErr);
      return res.status(500).json({ message: "Failed to evaluate audience votes" });
    }

    if (!evaluation.winner) {
      return res.status(400).json({ message: "No audience votes available to finalize the result" });
    }

    resultModel.publishResult({
      debate_id,
      winning_team: evaluation.winner.team,
      average_rating: evaluation.overallAverageRating
    }, (publishErr) => {
      if (publishErr) {
        console.error("Result publish error:", publishErr);
        return res.status(500).json({
          message: publishErr.code === "ER_NO_REFERENCED_ROW_2" ? "Invalid debate" : "Publish failed"
        });
      }

      res.json({
        message: "Result published",
        winning_team: evaluation.winner.team,
        average_rating: evaluation.overallAverageRating,
        audience_summary: evaluation.summaries
      });
    });
  });
};

exports.evaluateResult = (req, res) => {
  const debateId = Number(req.params.id);

  if (!debateId) {
    return res.status(400).json({ message: "Debate ID is required" });
  }

  buildAudienceEvaluation(debateId, (err, evaluation) => {
    if (err) {
      console.error("Audience evaluation error:", err);
      return res.status(500).json({ message: "Failed to evaluate audience votes" });
    }

    res.json({
      winning_team: evaluation.winner?.team || null,
      average_rating: evaluation.overallAverageRating,
      audience_summary: evaluation.summaries
    });
  });
};

exports.getLatestResult = (req, res) => {
  resultModel.getLatest((err, rows) => {
    if (err) return res.status(500).json({ message: "Fetch failed" });
    res.json(rows[0]);
  });
};
