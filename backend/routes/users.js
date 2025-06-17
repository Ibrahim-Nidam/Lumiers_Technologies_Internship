const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNonAdminUsers,
  toggleUserField,
  getAssignableRoles,
  updateUserRole
} = require("../controllers/userController");

// Fetch users (non-admin)
router.get("/", authMiddleware, getNonAdminUsers);

// Toggle user field (status or car ownership)
router.patch("/:id", authMiddleware, toggleUserField);

// Update user role
router.patch("/:id/role", authMiddleware, updateUserRole);

// Fetch assignable roles
router.get("/roles", authMiddleware, getAssignableRoles);

module.exports = router;
