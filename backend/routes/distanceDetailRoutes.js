const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const ctrl = require("../controllers/distanceDetailController");

// All routes require authentication
router.use(auth);

// Create
// POST /api/distance-details
router.post("/", ctrl.createSegment);

// Read by date
// GET /api/distance-details?date=2025-06-26
router.get("/", ctrl.getSegmentsByDate);

// Update
// PUT /api/distance-details/:id
router.put("/:id", ctrl.updateSegment);

// Delete
// DELETE /api/distance-details/:id
router.delete("/:id", ctrl.deleteSegment);

router.get("/dates-with-segments", auth, ctrl.getDatesWithSegments)

module.exports = router;
