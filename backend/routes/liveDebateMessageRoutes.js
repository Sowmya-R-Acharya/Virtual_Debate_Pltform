const router = require("express").Router();
const liveDebateMessageController = require("../controllers/liveDebateMessageController");

router.get("/:debateId", liveDebateMessageController.getMessages);
router.post("/", liveDebateMessageController.createMessage);

module.exports = router;
