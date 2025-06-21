const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllRatesByUser,
  createRate,
  updateRate,
  deleteRate,
  getRateById,
} = require("../controllers/vehiculeRateRuleController");

// GET all rates for a user
router.get("/user/:userId", authMiddleware, getAllRatesByUser);

// GET one rate by ID
router.get("/:id", authMiddleware, getRateById);

// CREATE a new rate
router.post("/", authMiddleware, createRate);

// UPDATE a rate
router.patch("/:id", authMiddleware, updateRate);

// DELETE a rate
router.delete("/:id", authMiddleware, deleteRate);

module.exports = router;
