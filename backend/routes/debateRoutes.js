const express = require("express");
const router = express.Router();
const debateController = require("../controllers/debateController");

/* CREATE DEBATE */
router.post("/create", debateController.createDebate);

/* GET ALL DEBATES (ADMIN) */
router.get("/", debateController.getDebates);

/* GET ASSIGNED DEBATES (DEBATER) */
router.get("/assigned/:teamName", debateController.getDebatesByTeam);

/* GENERATE AI DEBATE */
router.post("/generate-ai", debateController.generateAIDebate);

/* DELETE DEBATE */
router.delete("/:id", debateController.deleteDebate);

module.exports = router;
