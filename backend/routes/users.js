const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getNonAdminUsers,
  toggleUserField,
  getAssignableRoles,
  updateUserRole,
  getUsersWithCars,
  createUser,
  resetUserPassword,
} = require("../controllers/userController");

// Fetch users (non-admin)
router.get("/", authMiddleware, getNonAdminUsers);

// Toggle user field (status or car ownership)
router.patch("/:id", authMiddleware, toggleUserField);

// Update user role
router.patch("/:id/role", authMiddleware, updateUserRole);

// Update user reset-password
router.patch("/:id/reset-password", authMiddleware, resetUserPassword);

// Fetch assignable roles
router.get("/roles", authMiddleware, getAssignableRoles);

// GET only users with cars
router.get("/with-car", authMiddleware, getUsersWithCars);

router.post("/", authMiddleware, createUser);
module.exports = router;
