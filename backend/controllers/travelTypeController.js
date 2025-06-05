// controllers/travelTypeController.js
const { TypeDeDeplacement } = require("../models");

// ─────────────────────────────────────────────────────────────
// GET All Travel Types
// ─────────────────────────────────────────────────────────────
exports.getAllTravelTypes = async (req, res) => {
  try {
    const types = await TypeDeDeplacement.findAll();
    res.json(types);
  } catch (error) {
    console.error("Error fetching travel types:", error);
    res.status(500).json({ error: "Failed to fetch Travel types." });
  }
};

// ─────────────────────────────────────────────────────────────
// POST Create New Travel Type
// ─────────────────────────────────────────────────────────────
exports.createTravelType = async (req, res) => {
  const { nom, description } = req.body;
  try {
    const newType = await TypeDeDeplacement.create({ nom, description });
    res.status(201).json(newType);
  } catch (error) {
    console.error("Error creating travel type:", error);
    res.status(400).json({ error: "Failed to create Travel type." });
  }
};

// ─────────────────────────────────────────────────────────────
// PUT Update Travel Type
// ─────────────────────────────────────────────────────────────
exports.updateTravelType = async (req, res) => {
  const { id } = req.params;
  const { nom, description } = req.body;

  try {
    const type = await TypeDeDeplacement.findByPk(id);
    if (!type) {
      return res.status(404).json({ error: "Travel type not found." });
    }

    type.nom = nom ?? type.nom;
    type.description = description ?? type.description;
    await type.save();

    res.json(type);
  } catch (error) {
    console.error("Error updating travel type:", error);
    res.status(400).json({ error: "Failed to update Travel type." });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE Travel Type
// ─────────────────────────────────────────────────────────────
exports.deleteTravelType = async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await TypeDeDeplacement.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: "Travel type not found." });
    }

    res.json({ message: "Travel type deleted." });
  } catch (error) {
    console.error("Error deleting travel type:", error);
    res.status(500).json({ error: "Failed to delete Travel type." });
  }
};
