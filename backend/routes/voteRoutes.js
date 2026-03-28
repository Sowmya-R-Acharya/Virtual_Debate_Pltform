const express = require("express");
const router = express.Router();

const {
  vote,
  getVotes,
  getVotesByDebate,
  deleteVote
} = require("../controllers/voteController");

const { verifyToken, authorize } = require("../middlewares/authMiddleware");

/* Audience submits vote */
router.post("/submit", verifyToken, authorize("AUDIENCE"), vote);

/* Admin views votes */
router.get("/", verifyToken, authorize("ADMIN"), getVotes);

/* Get votes by debate */
router.get("/:id", verifyToken, authorize("ADMIN"), getVotesByDebate);

/* Delete vote */
router.delete("/:id", verifyToken, authorize("ADMIN"), deleteVote);

module.exports = router;
