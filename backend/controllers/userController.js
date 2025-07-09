const { User, Role } = require("../models");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

// Create user controller for POST /api/users
exports.createUser = async (req, res) => {
  const { name, email, password, cnie, roleId, hasCar, isActive } = req.body;

  if (!name || !email || !password || !cnie || !roleId || hasCar === undefined || isActive === undefined) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    const existingCnie = await User.findOne({ where: { cartNational: cnie } });
    if (existingCnie) return res.status(400).json({ error: 'CNIE already used.' });

    const existingUser = await User.findOne({ where: { courriel: email } });
    if (existingUser) return res.status(400).json({ error: 'Email already used.' });

    const role = await Role.findByPk(roleId);
    if (!role) return res.status(400).json({ error: 'Invalid role.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      nomComplete: name,
      courriel: email,
      motDePasseHache: hashedPassword,
      roleId: role.id,
      cartNational: cnie.toUpperCase(),
      possedeVoiturePersonnelle: hasCar,
      estActif: isActive,
      dateCreation: new Date(),
      dateModification: new Date(),
    });

    res.status(201).json({ message: "User created successfully.", userId: newUser.id });
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// GET Non-admin Users
exports.getNonAdminUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: "role" }],
    });

    const result = users.map(u => ({
      id: u.id,
      name: u.nomComplete,
      email: u.courriel,
      hasCar: u.possedeVoiturePersonnelle,
      status: u.estActif ? "Actif" : "Inactif",
      role: u.role?.nom,
      cnie: u.cartNational,
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
    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    if (field === "estActif") {
      targetUser.estActif = value;
    } else if (field === "possedeVoiturePersonnelle") {
      targetUser.possedeVoiturePersonnelle = value;
    } else if (field === "cartNational") {
      if (typeof value !== "string" || value.trim() === "") {
        return res.status(400).json({ error: "CNIE invalide." });
      }
      targetUser.cartNational = value.trim().toUpperCase();
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

// PATCH Reset User Password
exports.resetUserPassword = async (req, res) => {
  const { id } = req.params;
  const defaultPassword = "Lumieres1!";

  try {
    const targetUser = await User.findByPk(id);

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    targetUser.motDePasseHache = hashedPassword;
    targetUser.dateModification = new Date();
    
    await targetUser.save();

    res.json({ 
      success: true, 
      message: "Mot de passe réinitialisé avec succès.",
      defaultPassword: defaultPassword 
    });
  } catch (err) {
    console.error("Error resetting user password:", err);
    res.status(500).json({ error: "Erreur lors de la réinitialisation du mot de passe." });
  }
};

// GET assignable roles
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

// GET Users With Cars
exports.getUsersWithCars = async (req, res) => {
  try {
    const users = await User.findAll({
      where: {
        possedeVoiturePersonnelle: true,
        estActif: true
      },
      include: [
        {
          model: Role,
          as: "role",
          where: {
            nom: {
              [Op.notIn]: ["agent", "manager"]
            }
          }
        }
      ]
    });

    const result = users.map(u => ({
      id: u.id,
      nomComplete: u.nomComplete,
      email: u.courriel,
      role: u.role?.nom,
      cnie: u.cartNational,
      avatar: u.nomComplete?.split(" ").map(w => w[0]).join("").toUpperCase(),
    }));

    res.json(result);
  } catch (err) {
    console.error("Error fetching users with cars:", err);
    res.status(500).json({ error: "Échec du chargement des utilisateurs." });
  }
};