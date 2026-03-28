const teamModel = require("../models/teamModel");
const FALLBACK_TEAMS = [
  "Team Alpha",
  "Team Beta",
  "Team Gamma",
  "Team Delta",
  "Team Sigma",
  "Team Omega",
  "Team Phoenix",
  "Team Titan",
  "Team Orion",
  "Team Nova"
];

exports.createTeam = (req, res) => {
  const { name } = req.body;
  const created_by = req.user.id; // JWT middleware sets req.user

  teamModel.createTeam({ name, created_by }, (err) => {
    if (err) {
      console.error("Team creation error:", err);
      return res.status(500).json({ message: "Team creation failed" });
    }
    res.json({ message: "Team created successfully" });
  });
};

exports.getTeams = (req, res) => {
  teamModel.getAllTeamsOrSeedDefaults((err, rows) => {
    if (err) {
      console.error("Team fetch error:", err);
      return res.json(
        FALLBACK_TEAMS.map((name, index) => ({
          id: index + 1,
          name
        }))
      );
    }
    res.json(rows);
  });
};

exports.deleteTeam = (req, res) => {
  const { id } = req.params;

  teamModel.deleteTeam(id, (err) => {
    if (err) {
      console.error("Team deletion error:", err);
      return res.status(500).json({ message: "Team deletion failed" });
    }
    res.json({ message: "Team deleted successfully" });
  });
};
