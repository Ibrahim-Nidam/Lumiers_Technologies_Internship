const express = require("express");
const router = express.Router();
const { User, Role } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");

// Get non-admin users
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role }],
      where: {},
    });

    const filtered = users.filter(user => {
      const roleName = user.Role?.nom.toLowerCase();
      return roleName !== "admin" && roleName !== "superadmin";
    });

    res.json(filtered.map(u => ({
      id: u.id,
      name: u.nomComplete,
      email: u.courriel,
      hasCar: u.possedeVoiturePersonnelle,
      status: u.estActif ? "Actif" : "Inactif",
      role: u.Role?.nom,
      avatar: u.nomComplete?.split(" ").map(w => w[0]).join("").toUpperCase(),
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// Toggle status or car ownership
// routes/users.js
router.patch("/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { field, value } = req.body;

  try {
    const requestingUser = await User.findByPk(req.user.userId, {
      include: Role
    });

    const targetUser = await User.findByPk(id, {
      include: Role
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Utilisateur introuvable." });
    }

    // Prevent manager from updating another manager or super manager
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
    console.error(err);
    return res.status(500).json({ error: "Erreur serveur." });
  }
});


module.exports = router;