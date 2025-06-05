// controllers/userController.js
const { User, Role } = require("../models");

// ─────────────────────────────────────────────────────────────
// GET Non-admin Users
// ─────────────────────────────────────────────────────────────
exports.getNonAdminUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role }],
    });

    const filtered = users.filter(user => {
      const roleName = user.Role?.nom.toLowerCase();
      return roleName !== "admin" && roleName !== "superadmin";
    });

    const result = filtered.map(u => ({
      id: u.id,
      name: u.nomComplete,
      email: u.courriel,
      hasCar: u.possedeVoiturePersonnelle,
      status: u.estActif ? "Actif" : "Inactif",
      role: u.Role?.nom,
      avatar: u.nomComplete?.split(" ").map(w => w[0]).join("").toUpperCase(),
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH Toggle User Status or Car Ownership
// ─────────────────────────────────────────────────────────────
exports.toggleUserField = async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  try {
    const requestingUser = await User.findByPk(req.user.userId, {
      include: Role,
    });

    const targetUser = await User.findByPk(id, {
      include: Role,
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const restrictedRoles = ["supermanager"];
    const requesterRole = requestingUser.Role.nom.toLowerCase();
    const targetRole = targetUser.Role.nom.toLowerCase();

    if (
      requesterRole === "manager" &&
      restrictedRoles.includes(targetRole)
    ) {
      return res.status(403).json({
        error: "Vous n'avez pas la permission de modifier ce compte.",
      });
    }

    if (field === "estActif") {
      targetUser.estActif = value;
    } else if (field === "possedeVoiturePersonnelle") {
      targetUser.possedeVoiturePersonnelle = value;
    } else {
      return res.status(400).json({ error: "Champ non valide." });
    }

    await targetUser.save();
    return res.json({ success: true });
  } catch (err) {
    console.error("Error updating user field:", err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};
