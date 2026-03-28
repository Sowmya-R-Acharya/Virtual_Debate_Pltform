const { generateDebateScript } = require("../services/geminiDebateService");

exports.generateDebate = async (req, res) => {
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
