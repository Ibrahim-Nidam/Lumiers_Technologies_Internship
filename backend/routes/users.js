const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { getNonAdminUsers, toggleUserField, getAssignableRoles, updateUserRole, getUsersWithCars, createUser, resetUserPassword } = require("../controllers/userController");

router.get("/", authMiddleware, getNonAdminUsers);
router.patch("/:id", authMiddleware, toggleUserField);
router.patch("/:id/role", authMiddleware, updateUserRole);
router.patch("/:id/reset-password", authMiddleware, resetUserPassword);
router.post("/", authMiddleware, createUser);

router.get("/roles", authMiddleware, getAssignableRoles);
router.get("/with-car", authMiddleware, getUsersWithCars);

module.exports = router;
