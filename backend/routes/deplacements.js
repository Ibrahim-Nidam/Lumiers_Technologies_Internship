const express = require("express")
const router = express.Router()
const ctrl = require("../controllers/deplacementController")
const authMiddleware = require("../middleware/authMiddleware") 
const upload = require("../middleware/upload");

// Apply auth middleware to all routes
router.use(authMiddleware)

router.get("/", ctrl.getDeplacements)
router.post("/", ctrl.createDeplacement)
router.put("/:id", ctrl.updateDeplacement)
router.delete("/:id", ctrl.deleteDeplacement)
router.post("/:tripId/depenses/:expenseId/justificatif", upload.single("justificatif"), ctrl.addExpenseJustificatif);
router.delete("/:tripId/depenses/:expenseId/justificatif",ctrl.removeExpenseJustificatif);

module.exports = router
