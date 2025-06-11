const express = require("express")
const router = express.Router()
const ctrl = require("../controllers/deplacementController")
const authMiddleware = require("../middleware/authMiddleware") // Add this import

// Debug logging
router.use((req, res, next) => {
  console.log(`Deplacements route: ${req.method} ${req.path}`)
  console.log("Headers:", req.headers.authorization ? "Auth header present" : "No auth header")
  next()
})

// Apply auth middleware to all routes
router.use(authMiddleware)

router.get("/", ctrl.getDeplacements)
router.post("/", ctrl.createDeplacement)
router.put("/:id", ctrl.updateDeplacement)
router.delete("/:id", ctrl.deleteDeplacement)

module.exports = router
