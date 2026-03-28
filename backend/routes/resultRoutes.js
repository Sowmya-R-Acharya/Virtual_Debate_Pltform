const router = require("express").Router();
const c = require("../controllers/resultController");
const { verifyToken, authorize } = require("../middlewares/authMiddleware");

router.get("/evaluate/:id", verifyToken, authorize("ADMIN"), c.evaluateResult);
router.post("/publish", verifyToken, authorize("ADMIN"), c.publishResult);
router.get("/latest", c.getLatestResult);

module.exports = router;
