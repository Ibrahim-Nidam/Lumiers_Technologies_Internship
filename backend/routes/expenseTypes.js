const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  getAllTypes,
  createType,
  updateType,
  deleteType,
} = require("../controllers/typeDepenseController");

router.get("/", authMiddleware, getAllTypes);
router.post("/", authMiddleware, createType);
router.put("/:id", authMiddleware, updateType);
router.delete("/:id", authMiddleware, deleteType);

module.exports = router;
