const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { User, Role, CarLoan } = require("../models");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "XDPhzwLeitK4Vvj7wWnSOXhhq9tfE3Tq";

// ───────────────────────────────────────────────────────────────
// 1) REGISTER: POST /api/auth/register
// ───────────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { name, email, password, role, carLoan } = req.body;

  // 1. Basic validation
  if (!name || !email || !password || !role) {
    return res
      .status(400)
      .json({ error: "name, email, password and role are all required." });
  }

  try {
    // 2. Check if email already exists
    const existingUser = await User.findOne({ where: { courriel: email } });
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé." });
    }

    // 3. Hash the password
    const saltRounds = 10;
    const hashed = await bcrypt.hash(password, saltRounds);

    // 4. Determine correct role to assign
    let selectedRoleName = role;

    // If selected role is "manager", check if it's the first one
    if (role === "manager") {
      const existingManagers = await User.count({
        include: {
          model: Role,
          where: { nom: ["manager", "SuperManager"] },
        },
      });

      if (existingManagers === 0) {
        selectedRoleName = "SuperManager"; // First manager becomes SuperManager
      }
    }

    const roleInstance = await Role.findOne({ where: { nom: selectedRoleName } });
    if (!roleInstance) {
      return res
        .status(400)
        .json({ error: `Role '${selectedRoleName}' introuvable dans la base.` });
    }


    // 5. Create the user
    const newUser = await User.create({
      nomComplete: name,
      courriel: email,
      motDePasseHache: hashed,
      roleId: roleInstance.id,
      possedeVoiturePersonnelle:
        Array.isArray(carLoan) && carLoan.length > 0,
      estActif: true, // or false if you want to require activation
      dateCreation: new Date(),
      dateModification: new Date(),
    });

    // 6. If carLoan entries were provided, bulk‐insert them
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

    // Return the created user’s ID and a success message
    return res
      .status(201)
      .json({ message: "Compte créé avec succès.", userId: newUser.id });
  } catch (err) {
    console.error("Error in /register:", err);
    return res
      .status(500)
      .json({ error: "Une erreur est survenue lors de l'inscription." });
  }
});

// ───────────────────────────────────────────────────────────────
// 2) LOGIN: POST /api/auth/login
// ───────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // 1. Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  try {
    // 2. Find the user by email (and join their role)
    const user = await User.findOne({
      where: { courriel: email },
      include: [{ model: Role, attributes: ["nom"] }],
    });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe invalide." });
    }
    if (!user.estActif) {
      return res
        .status(403)
        .json({ error: "Ce compte n'est pas encore activé." });
    }

    // 3. Compare password
    const match = await bcrypt.compare(password, user.motDePasseHache);
    if (!match) {
      return res.status(401).json({ error: "Email ou mot de passe invalide." });
    }

    // 4. Issue JWT
    const payload = { userId: user.id, role: user.Role.nom };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" });

    // 5. Return exactly the fields your front‐end needs:
    return res.json({
      message: "Authentification réussie.",
      token,
      user: {
        id: user.id,
        nom_complete: user.nomComplete,    // <-- deliver nomComplete here
        email: user.courriel,
        role: user.Role.nom,
        possede_voiture_personnelle: user.possedeVoiturePersonnelle,
      },
    });
  } catch (err) {
    console.error("Error in /login:", err);
    return res
      .status(500)
      .json({ error: "Une erreur est survenue lors de la connexion." });
  }
});

module.exports = router;
