const { TauxMissionRole, User, Role, TypeDeDeplacement } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const data = await TauxMissionRole.findAll({
      include: [{ model: TypeDeDeplacement, as: 'typeDeDeplacement' }]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = await TauxMissionRole.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TauxMissionRole.findByPk(id);
    if (!entry) return res.status(404).json({ error: "Not found" });

    await entry.update(req.body);
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TauxMissionRole.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserMissionRates = async (req, res) => {
  try {
    // Get userId from route params, not from req.user
    const userId = req.params.userId;
    
    // Get user including their role(s)
    const user = await User.findByPk(userId, {
      include: {
        model: Role,
        as: "role",
        attributes: ["id", "nom"],
      },
    });

    if (!user || !user.role) {
      return res.status(404).json({ message: "User or user role not found" });
    }

    // Handle both single role and array of roles
    const roleId = Array.isArray(user.role) ? user.role[0].id : user.role.id;

    // Fetch mission rates for this role
    const missionRates = await TauxMissionRole.findAll({
      where: { roleId },
      include: [
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
          attributes: ["id", "nom", "description"],
        },
      ],
      order: [["dateCreation", "DESC"]],
    });

    res.json(missionRates);
  } catch (error) {
    console.error("Error fetching user mission rates by role:", error);
    res.status(500).json({
      message: "Error fetching user mission rates by role",
      error: error.message,
    });
  }
};