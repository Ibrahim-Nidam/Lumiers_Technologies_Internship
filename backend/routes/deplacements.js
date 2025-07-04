const express = require("express")
const router = express.Router()
const ctrl = require("../controllers/deplacementController")
const authMiddleware = require("../middleware/authMiddleware") 
const managerAccessMiddleware = require("../middleware/managerAccessMiddleware")
const {uploadWithErrorHandling} = require("../middleware/upload");

// Apply auth middleware to all routes
router.use(authMiddleware)

// Routes that may require manager access (when X-Target-User-Id header is present)
router.get("/", managerAccessMiddleware, ctrl.getDeplacements)
router.post("/", managerAccessMiddleware, ctrl.createDeplacement)
router.put("/:id", managerAccessMiddleware, ctrl.updateDeplacement)
router.delete("/:id", managerAccessMiddleware, ctrl.deleteDeplacement)

// Specific route for managers to access user data by userId
router.get("/user/:userId", managerAccessMiddleware, ctrl.getDeplacementsByUserId)

// File upload routes (these will also check manager access if needed)
router.post("/:tripId/depenses/:expenseId/justificatif", 
  managerAccessMiddleware, 
  uploadWithErrorHandling,  // Use the debug version
  ctrl.addExpenseJustificatif
);
router.delete("/:tripId/depenses/:expenseId/justificatif", 
  managerAccessMiddleware,
  ctrl.removeExpenseJustificatif
);

// GET /api/deplacements/dates
router.get("/dates",authMiddleware, ctrl.getAvailableDates);

module.exports = router