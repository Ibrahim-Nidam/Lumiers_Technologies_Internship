const { Role } = require('../models');
const { Op } = require('sequelize');

// Get all roles excluding 'admin' and 'superadmin'
exports.getAll = async (req, res) => {
  try {
    const roles = await Role.findAll(); // You can add a limit here to test: limit: 5
    res.json(roles);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: err.message });
  }
};


// Create a new role
exports.create = async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a role by ID
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await Role.findByPk(id);
    if (!role) return res.status(404).json({ error: "Role not found" });

    await role.update(req.body);
    res.json(role);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a role by ID
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Role.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Role not found" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
