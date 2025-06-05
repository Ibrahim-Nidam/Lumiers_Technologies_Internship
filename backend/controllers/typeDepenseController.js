const { TypeDepense } = require("../models");

// ─────────────────────────────────────────────────────────────
// GET all expense types
// ─────────────────────────────────────────────────────────────
exports.getAllTypes = async (req, res) => {
  try {
    const types = await TypeDepense.findAll();
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch expense types." });
  }
};

// ─────────────────────────────────────────────────────────────
// CREATE a new expense type
// ─────────────────────────────────────────────────────────────
exports.createType = async (req, res) => {
  const { nom, description } = req.body;
  try {
    const newType = await TypeDepense.create({ nom, description });
    res.status(201).json(newType);
  } catch (error) {
    res.status(400).json({ error: "Failed to create expense type." });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE an expense type by ID
// ─────────────────────────────────────────────────────────────
exports.updateType = async (req, res) => {
  const { id } = req.params;
  const { nom, description } = req.body;

  try {
    const type = await TypeDepense.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: "Expense type not found." });
    }

    type.nom = nom ?? type.nom;
    type.description = description ?? type.description;
    await type.save();

    res.json(type);
  } catch (error) {
    res.status(400).json({ error: "Failed to update expense type." });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE an expense type by ID
// ─────────────────────────────────────────────────────────────
exports.deleteType = async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = await TypeDepense.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Expense type not found." });
    }

    res.json({ message: "Expense type deleted." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete expense type." });
  }
};
