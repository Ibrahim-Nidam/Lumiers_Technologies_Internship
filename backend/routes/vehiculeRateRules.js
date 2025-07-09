const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getAllRatesByUser, createRate, updateRate, deleteRate, getRateById } = require("../controllers/vehiculeRateRuleController");

router.get("/user/:userId", authMiddleware, getAllRatesByUser);

router.get("/:id", authMiddleware, getRateById);
router.post("/", authMiddleware, createRate);
router.patch("/:id", authMiddleware, updateRate);
router.delete("/:id", authMiddleware, deleteRate);

module.exports = router;
