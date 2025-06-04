const express = require('express');
const router = express.Router();
const { TypeDeDeplacement } = require('../models');
const authMiddleware = require("../middleware/authMiddleware");

// Get all Travel types
router.get("/", authMiddleware, async (req, res) => {
  try {
    const types = await TypeDeDeplacement.findAll();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Travel types." });
  }
});

// Create new Travel type
router.post("/", authMiddleware, async (req, res) => {
  const { nom, description } = req.body;
  try {
    const newType = await TypeDeDeplacement.create({ nom, description });
    res.status(201).json(newType);
  } catch (error) {
    res.status(400).json({ error: "Failed to create Travel type." });
  }
});

// Update Travel type
router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nom, description } = req.body;
  try {
    const type = await TypeDeDeplacement.findByPk(id);
    if (!type) return res.status(404).json({ error: "Travel type not found." });

    type.nom = nom ?? type.nom;
    type.description = description ?? type.description;
    await type.save();

    res.json(type);
  } catch (error) {
    res.status(400).json({ error: "Failed to update Travel type." });
  }
});

// Delete Travel type
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await TypeDeDeplacement.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Travel type not found." });

    res.json({ message: "Travel type deleted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete Travel type." });
  }
});

module.exports = router;