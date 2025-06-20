const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const profileController = require("../controllers/profileController");

const router = express.Router();

router.get("/roles", profileController.getRoles);
router.get("/users/me", authMiddleware, profileController.getUserProfile);
router.put("/users/me", authMiddleware, profileController.updateUserProfile);

module.exports = router;