// routes/travelTypes.js
const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllTravelTypes,
  createTravelType,
  updateTravelType,
  deleteTravelType,
} = require("../controllers/travelTypeController");

router.get("/", authMiddleware, getAllTravelTypes);
router.post("/", authMiddleware, createTravelType);
router.put("/:id", authMiddleware, updateTravelType);
router.delete("/:id", authMiddleware, deleteTravelType);

module.exports = router;
