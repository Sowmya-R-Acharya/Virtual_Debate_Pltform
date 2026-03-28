const debateModel = require("../models/debateModel");
const { generateDebateScript } = require("../services/geminiDebateService");

/* CREATE */
exports.createDebate = (req, res) => {
  const { title, topic, teamPair, date, duration } = req.body || {};

  if (!title || !topic || !teamPair || !date || !duration) {
    return res.status(400).json({ message: "Title, topic, team pair, date, and duration are required" });
  }

  debateModel.createDebate(req.body, (err) => {
    if (err) {
      console.error("❌ CREATE ERROR:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.status(201).json({ message: "Debate created successfully" });
  });
};

/* GET ALL (ADMIN DASHBOARD) */
exports.getDebates = (req, res) => {
  debateModel.getAllDebates((err, rows) => {
    if (err) {
      console.error("❌ FETCH ERROR:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
};

/* GET ASSIGNED (DEBATER DASHBOARD) */
exports.getDebatesByTeam = (req, res) => {
  const { teamName } = req.params;

  debateModel.getDebatesByTeam(teamName, (err, rows) => {
    if (err) {
      console.error("❌ TEAM FETCH ERROR:", err);
      return res.status(500).json({ message: "Database error" });
    }
    res.json(rows);
  });
};

/* GENERATE AI DEBATE */
exports.generateAIDebate = async (req, res) => {
  const { topic, title, team_pair: teamPair, team_name: teamName, duration } = req.body || {};

  if (!topic) {
    return res.status(400).json({ message: "Topic is required to generate an AI debate." });
  }

  try {
    const debate = await generateDebateScript({
      topic,
      title,
      teamPair,
      teamName,
      duration
    });

    if (!debate.turns.length) {
      return res.status(502).json({ message: "Gemini returned an incomplete debate script." });
    }

    return res.json(debate);
  } catch (error) {
    console.error("Gemini debate generation failed:", error);
    return res.status(500).json({ message: error.message || "Failed to generate AI debate." });
  }
};

/* DELETE */
exports.deleteDebate = (req, res) => {
  debateModel.deleteDebate(req.params.id, (err) => {
    if (err) {
      console.error("❌ DELETE ERROR:", err);
      return res.status(500).json({ message: "Delete failed" });
    }
    res.json({ message: "Debate deleted successfully" });
  });
};
