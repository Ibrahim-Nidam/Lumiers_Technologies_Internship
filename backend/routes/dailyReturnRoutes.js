const express = require("express")
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const {
  getAllUserDailyReturns,
  createDailyReturn,
  updateDailyReturn,
  deleteDailyReturn,
  getUserApprovedDailyReturns,
} = require("../controllers/dailyReturnController")

// Apply authentication middleware to all daily return routes
router.use(authMiddleware)

// IMPORTANT: Put the /approved route BEFORE the generic / route
// This prevents the /approved from being caught by the / route
router.get("/approved", getUserApprovedDailyReturns)

// Define other API routes for daily returns
router.get("/", getAllUserDailyReturns)
router.post("/", createDailyReturn)
router.put("/:id", updateDailyReturn)
router.delete("/:id", deleteDailyReturn)

module.exports = router
