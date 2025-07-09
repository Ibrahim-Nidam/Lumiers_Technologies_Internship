const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const managerAccessMiddleware = require("../middleware/managerAccessMiddleware")
const ctrl = require("../controllers/distanceDetailController");

router.use(auth);

router.post("/", ctrl.createSegment);
router.get("/", ctrl.getSegmentsByDate);
router.put("/:id", ctrl.updateSegment);
router.delete("/:id", ctrl.deleteSegment);

router.get("/dates-with-segments", auth, ctrl.getDatesWithSegments)
router.get('/all', ctrl.getAllDistanceDetails);
router.delete('/admin/:id', managerAccessMiddleware, ctrl.adminDeleteSegment);

module.exports = router;
