const { User, Role } = require("../models");

// GET Non-admin Users
exports.getNonAdminUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: "role" }],
    });

    const filtered = users.filter(user => {
      const roleName = user.role?.nom.toLowerCase();
      return roleName !== "admin" && roleName !== "superadmin";
    });

    const result = filtered.map(u => ({
      id: u.id,
      name: u.nomComplete,
      email: u.courriel,
      hasCar: u.possedeVoiturePersonnelle,
      status: u.estActif ? "Actif" : "Inactif",
      role: u.role?.nom,
      avatar: u.nomComplete?.split(" ").map(w => w[0]).join("").toUpperCase(),
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

// PATCH Toggle User Status or Car Ownership
exports.toggleUserField = async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  try {
    const requestingUser = await User.findByPk(req.user.userId, {
      include: [{ model: Role, as: "role" }],
    });

    const targetUser = await User.findByPk(id, {
      include: [{ model: Role, as: "role" }],
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const restrictedRoles = ["supermanager"];
    const requesterRole = requestingUser.role?.nom.toLowerCase();
    const targetRole = targetUser.role?.nom.toLowerCase();

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

// GET assignable roles (filter out admin and superadmin)
exports.getAssignableRoles = async (req, res) => {
  try {
    const roles = await Role.findAll();

    const filteredRoles = roles.filter(
      (r) => !["admin", "superadmin", "super admin"].includes(r.nom.toLowerCase())
    );

    const rolesUpper = filteredRoles.map(r => ({
      id: r.id,
      nom: r.nom
    }));

    res.json(rolesUpper);
  } catch (err) {
    console.error("Error fetching roles:", err);
    res.status(500).json({ error: "Erreur lors du chargement des rôles." });
  }
};

// PATCH Update User Role
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { roleId } = req.body;

  try {
    const user = await User.findByPk(id, {
      include: [{ model: Role, as: "role" }],
    });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(400).json({ error: "Rôle invalide." });
    }

    user.roleId = roleId;
    await user.save();

    res.json({ success: true, role: role.nom });
  } catch (err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
};
