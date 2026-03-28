const router = require("express").Router();
const c = require("../controllers/teamController");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/create", authMiddleware.verifyToken, c.createTeam);
router.get("/", c.getTeams);
router.delete("/:id", authMiddleware.verifyToken, c.deleteTeam);

module.exports = router;
