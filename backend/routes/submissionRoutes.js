const router = require("express").Router();
const c = require("../controllers/submissionController");

router.get("/", c.getSubmittedDebates);
router.get("/all", c.getAllSubmissions);
router.post("/submit", c.submitDebate);
router.put("/:id", c.updateStatus);
router.delete("/:id", c.deleteSubmission);

module.exports = router;
