const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Role, CarLoan } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "XDPhzwLeitK4Vvj7wWnSOXhhq9tfE3Tq";

// ───────────────────────────────────────────────────────────────
// REGISTER Controller
// ───────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, role, carLoan } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      error: "name, email, password and role are all required.",
    });
  }

  try {
    const existingUser = await User.findOne({ where: { courriel: email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashed = await bcrypt.hash(password, 10);

    let selectedRoleName = role;
    if (role === "manager") {
      const existingManagers = await User.count({
        include: {
          model: Role,
          where: { nom: ["manager", "supermanager"] },
        },
      });
      if (existingManagers === 0) {
        selectedRoleName = "supermanager";
      }
    }

    const roleInstance = await Role.findOne({ where: { nom: selectedRoleName } });
    if (!roleInstance) {
      return res.status(400).json({
        error: `Role '${selectedRoleName}' introuvable dans la base.`,
      });
    }

    const newUser = await User.create({
      nomComplete: name,
      courriel: email,
      motDePasseHache: hashed,
      roleId: roleInstance.id,
      possedeVoiturePersonnelle: Array.isArray(carLoan) && carLoan.length > 0,
      estActif: true,
      dateCreation: new Date(),
      dateModification: new Date(),
    });

    if (Array.isArray(carLoan) && carLoan.length > 0) {
      const now = new Date();
      const carRows = carLoan
        .filter((e) => e.destination && e.taux)
        .map((e) => ({
          userId: newUser.id,
          libelle: e.destination,
          tarifParKm: e.taux,
          statut: "en_attente",
          approuveParGestionnaireId: null,
          dateCreation: now,
          dateModification: now,
        }));

      if (carRows.length > 0) {
        await CarLoan.bulkCreate(carRows);
      }
    }

    return res.status(201).json({
      message: "Compte créé avec succès.",
      userId: newUser.id,
    });
  } catch (err) {
    console.error("Error in register:", err);
    return res.status(500).json({
      error: "Une erreur est survenue lors de l'inscription.",
    });
  }
};

// ───────────────────────────────────────────────────────────────
// LOGIN Controller
// ───────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    const user = await User.findOne({
      where: { courriel: email },
      include: [{ model: Role, attributes: ["nom"] }],
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe invalide." });
    }

    if (!user.estActif) {
      return res.status(403).json({ error: "Ce compte n'est pas encore activé." });
    }

    const match = await bcrypt.compare(password, user.motDePasseHache);
    if (!match) {
      return res.status(401).json({ error: "Email ou mot de passe invalide." });
    }

    const payload = { userId: user.id, role: user.Role.nom };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    return res.json({
      message: "Authentification réussie.",
      token,
      user: {
        id: user.id,
        nom_complete: user.nomComplete,
        email: user.courriel,
        role: user.Role.nom,
        possede_voiture_personnelle: user.possedeVoiturePersonnelle,
      },
    });
  } catch (err) {
    console.error("Error in login:", err);
    return res.status(500).json({
      error: "Une erreur est survenue lors de la connexion.",
    });
  }
};