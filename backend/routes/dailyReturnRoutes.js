const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); 
const {
  getAllUserDailyReturns,
  createDailyReturn,
  updateDailyReturn,
  deleteDailyReturn,
} = require("../controllers/dailyReturnController");

// Apply authentication middleware to all daily return routes
router.use(authMiddleware);

// Define API routes for daily returns
router.get("/", getAllUserDailyReturns);
router.post("/", createDailyReturn);
router.put("/:id", updateDailyReturn);
router.delete("/:id", deleteDailyReturn);

module.exports = router;
