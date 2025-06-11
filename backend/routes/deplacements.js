const express = require("express")
const router = express.Router()
const ctrl = require("../controllers/deplacementController")
const authMiddleware = require("../middleware/authMiddleware") 


// Apply auth middleware to all routes
router.use(authMiddleware)

router.get("/", ctrl.getDeplacements)
router.post("/", ctrl.createDeplacement)
router.put("/:id", ctrl.updateDeplacement)
router.delete("/:id", ctrl.deleteDeplacement)

module.exports = router
