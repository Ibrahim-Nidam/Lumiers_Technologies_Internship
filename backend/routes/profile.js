// routes/user.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");

const router = express.Router();

router.get("/roles", profileController.getRoles);
router.get("/users/me", authMiddleware, profileController.getUserProfile);
router.put("/users/me", authMiddleware, profileController.updateUserProfile);
router.get("/users/me/carloans", authMiddleware, profileController.getUserCarLoans);
router.put("/users/me/carloans", authMiddleware, profileController.updateUserCarLoans);
router.delete("/users/me/carloans/:libelle", authMiddleware, profileController.deleteUserCarLoan);

module.exports = router;