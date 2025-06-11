const express = require("express")
const router = express.Router()
const authMiddleware = require("../middleware/authMiddleware")
const { getAllCarLoans, updateCarLoanStatus, getUserCarLoans } = require("../controllers/carLoanController")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// IMPORTANT: Put the /user route BEFORE the generic / route
router.get("/user", getUserCarLoans)

// Other routes
router.get("/", getAllCarLoans)
router.patch("/:id/status", updateCarLoanStatus)

module.exports = router
