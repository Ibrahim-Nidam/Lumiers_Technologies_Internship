// routes/missionRates.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllMissionRates,
  updateMissionRateStatus,
} = require("../controllers/missionRateController");

router.get("/", authMiddleware, getAllMissionRates);
router.patch("/:id/status", authMiddleware, updateMissionRateStatus);

module.exports = router;
