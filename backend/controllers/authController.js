const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Role} = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "XDPhzwLeitK4Vvj7wWnSOXhhq9tfE3Tq";

// ───────────────────────────────────────────────────────────────
// REGISTER Controller
// ───────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const { name, email, password, cnie } = req.body;

  if (!name || !email || !password || !cnie) {
    return res.status(400).json({
      error: "name, email, cnie, and password are required.",
    });
  }

  try {
    // Optional: check if CNIE is unique (if required)
    const existingCnie = await User.findOne({ where: { cartNational: cnie } });
    if (existingCnie) {
      return res.status(400).json({ error: "Ce CNIE est déjà utilisé." });
    }

    const existingUser = await User.findOne({ where: { courriel: email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    const hashed = await bcrypt.hash(password, 10);

    // Role detection logic
    let selectedRoleName = "agent"; // default role

    if (password === "Manager1.") {
      selectedRoleName = "manager";
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
      possedeVoiturePersonnelle: false,
      estActif: selectedRoleName === "manager" ? true : false,
      cartNational: cnie.toUpperCase(),
      dateCreation: new Date(),
      dateModification: new Date(),
    });

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
      include: [{ model: Role, as:"role", attributes: ["nom"] }],
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

    const payload = { userId: user.id, role: user.role.nom };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    return res.json({
      message: "Authentification réussie.",
      token,
      user: {
        id: user.id,
        nom_complete: user.nomComplete,
        email: user.courriel,
        role: user.role.nom,
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