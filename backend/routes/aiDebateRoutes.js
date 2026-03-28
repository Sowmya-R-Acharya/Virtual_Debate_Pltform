const express = require("express");
const aiDebateController = require("../controllers/aiDebateController");

const router = express.Router();

router.post("/generate", aiDebateController.generateDebate);

module.exports = router;
