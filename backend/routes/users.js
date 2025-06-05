const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNonAdminUsers,
  toggleUserField,
} = require("../controllers/userController");

router.get("/", authMiddleware, getNonAdminUsers);
router.patch("/:id", authMiddleware, toggleUserField);

module.exports = router;
