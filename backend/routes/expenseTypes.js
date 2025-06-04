const express = require("express");
const router = express.Router();
const { TypeDepense } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");

// Get all expense types
router.get("/", authMiddleware, async (req, res) => {
  try {
    const types = await TypeDepense.findAll();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expense types." });
  }
});

// Create new expense type
router.post("/", authMiddleware, async (req, res) => {
  const { nom, description } = req.body;
  try {
    const newType = await TypeDepense.create({ nom, description });
    res.status(201).json(newType);
  } catch (error) {
    res.status(400).json({ error: "Failed to create expense type." });
  }
});

// Update an expense type by id
router.put("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { nom, description } = req.body;
  try {
    const type = await TypeDepense.findByPk(id);
    if (!type) return res.status(404).json({ error: "Expense type not found." });

    type.nom = nom ?? type.nom;
    type.description = description ?? type.description;
    await type.save();

    res.json(type);
  } catch (error) {
    res.status(400).json({ error: "Failed to update expense type." });
  }
});

// Delete an expense type by id
router.delete("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await TypeDepense.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Expense type not found." });

    res.json({ message: "Expense type deleted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense type." });
  }
});

module.exports = router;