const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllCarLoans,
  updateCarLoanStatus,
} = require("../controllers/carLoanController");

router.get("/", authMiddleware, getAllCarLoans);
router.patch("/:id/status", authMiddleware, updateCarLoanStatus);

module.exports = router;