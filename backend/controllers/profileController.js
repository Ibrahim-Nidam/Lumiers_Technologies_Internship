const bcrypt = require("bcryptjs");
const { User, Role} = require("../models");



exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "nom"],
      order: [["id", "ASC"]],
    });
    res.json(roles);
  } catch (err) {
    console.error("GET /roles error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      where: { id: req.user.userId },
      attributes: ["id", "nomComplete", "courriel", "possedeVoiturePersonnelle", "cartNational"],
    });
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }
    res.json(user);
  } catch (err) {
    console.error("GET /users/me error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    const {
      nomComplete,
      courriel,
      motDePasse,
      cartNational, // <-- IMPORTANT: matches frontend formData
      possedeVoiturePersonnelle,
    } = req.body;

    if (nomComplete?.trim()) user.nomComplete = nomComplete.trim();
    if (courriel?.trim()) user.courriel = courriel.trim();
    if (cartNational?.trim()) user.cartNational = cartNational.trim();
    if (typeof possedeVoiturePersonnelle === "boolean") {
      user.possedeVoiturePersonnelle = possedeVoiturePersonnelle;
    }

    if (motDePasse && motDePasse.length >= 6) {
      user.motDePasseHache = await bcrypt.hash(motDePasse, 10);
    }

    await user.save();
    res.json({ message: "Profil mis à jour avec succès." });
  } catch (err) {
    console.error("PUT /users/me error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};
