const { TauxKilometriqueRole, User, Role  } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const data = await TauxKilometriqueRole.findAll();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = await TauxKilometriqueRole.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TauxKilometriqueRole.findByPk(id);
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
    const deleted = await TauxKilometriqueRole.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getUserCarLoans = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("Fetching mission rates for userId:", userId);

    // Get user with their role
    const user = await User.findByPk(userId, {
      include: {
        model: Role,
        as: "role",
        attributes: ["id", "nom"]
      }
    });

    console.log("User fetched:", user ? user.toJSON() : null);

    if (!user || !user.role) {
      return res.status(404).json({ message: "User or role not found" });
    }

    const roleId = user.role.id;

    // Fetch rates based on role
    const rates = await TauxKilometriqueRole.findAll({
      where: { roleId },
      order: [["dateCreation", "DESC"]]
    });

    res.json({ role: user.role.nom, rates });
  } catch (error) {
    console.error("Error fetching user's kilometer rates:", error);
    res.status(500).json({ message: "Error fetching rates", error: error.message });
  }
};