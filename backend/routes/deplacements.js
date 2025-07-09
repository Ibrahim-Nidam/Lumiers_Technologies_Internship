const express = require("express")
const router = express.Router()
const ctrl = require("../controllers/deplacementController")
const authMiddleware = require("../middleware/authMiddleware") 
const managerAccessMiddleware = require("../middleware/managerAccessMiddleware")
const {uploadWithErrorHandling} = require("../middleware/upload");

router.use(authMiddleware)

router.get("/", managerAccessMiddleware, ctrl.getDeplacements)
router.post("/", managerAccessMiddleware, ctrl.createDeplacement)
router.put("/:id", managerAccessMiddleware, ctrl.updateDeplacement)
router.delete("/:id", managerAccessMiddleware, ctrl.deleteDeplacement)

router.get("/user/:userId", managerAccessMiddleware, ctrl.getDeplacementsByUserId)

router.post("/:tripId/depenses/:expenseId/justificatif", managerAccessMiddleware, uploadWithErrorHandling, ctrl.addExpenseJustificatif);
router.delete("/:tripId/depenses/:expenseId/justificatif", managerAccessMiddleware, ctrl.removeExpenseJustificatif);

router.get("/dates",authMiddleware, ctrl.getAvailableDates);

module.exports = router