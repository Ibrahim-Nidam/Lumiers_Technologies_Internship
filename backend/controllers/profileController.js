// controllers/userController.js
const bcrypt = require("bcrypt");
const { User, Role, CarLoan } = require("../models");

function formatStatus(statut) {
  if (!statut) return "—";
  switch (statut) {
    case "en_attente":
      return "En attente";
    case "approuve":
      return "Approuvé";
    case "rejete":
      return "Rejeté";
    default:
      return String(statut)
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "nom", "description"],
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
      attributes: ["id", "nomComplete", "courriel", "possedeVoiturePersonnelle"],
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

    const { nomComplete, courriel, possedeVoiturePersonnelle, motDePasse } = req.body;

    user.nomComplete = nomComplete.trim();
    user.courriel = courriel.trim();
    user.possedeVoiturePersonnelle = !!possedeVoiturePersonnelle;

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

exports.getUserCarLoans = async (req, res) => {
  try {
    const carLoans = await CarLoan.findAll({
      where: { userId: req.user.userId },
      attributes: ["libelle", "tarifParKm", "statut"],
      order: [["id", "ASC"]],
    });

    res.json(carLoans.map((loan) => ({
      libelle: loan.libelle,
      tarifParKm: parseFloat(loan.tarifParKm),
      status: formatStatus(loan.statut),
    })));
  } catch (err) {
    console.error("GET /users/me/carloans error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};

exports.updateUserCarLoans = async (req, res) => {
  try {
    const userId = req.user.userId;
    const incomingArray = Array.isArray(req.body) ? req.body : [];

    for (let entry of incomingArray) {
      if (
        typeof entry.libelle !== "string" ||
        entry.libelle.trim() === "" ||
        typeof entry.tarifParKm !== "number" ||
        entry.tarifParKm <= 1
      ) {
        return res.status(400).json({ message: "Format invalide pour Taux de déplacement." });
      }
    }

    const existing = await CarLoan.findAll({ where: { userId } });
    const existingMap = new Map(existing.map((l) => [l.libelle.trim(), l]));
    const receivedLibelles = new Set();

    for (let entry of incomingArray) {
      const libelle = entry.libelle.trim();
      receivedLibelles.add(libelle);

      const existingLoan = existingMap.get(libelle);
      if (existingLoan) {
        existingLoan.tarifParKm = entry.tarifParKm;
        existingLoan.statut = "en_attente";
        await existingLoan.save();
      } else {
        await CarLoan.create({
          userId,
          libelle,
          tarifParKm: entry.tarifParKm,
          statut: "en_attente",
        });
      }
    }

    for (let loan of existing) {
      if (!receivedLibelles.has(loan.libelle.trim())) {
        loan.statut = "en_attente";
        await loan.save();
      }
    }

    res.json({ message: "Taux de déplacement mis à jour." });
  } catch (err) {
    console.error("PUT /users/me/carloans error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};

exports.deleteUserCarLoan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { libelle } = req.params;

    if (!libelle || !libelle.trim()) {
      return res.status(400).json({ message: "Libellé requis." });
    }

    const deleted = await CarLoan.destroy({
      where: {
        userId,
        libelle: decodeURIComponent(libelle.trim()),
      },
    });

    if (deleted === 0) {
      return res.status(404).json({ message: "Taux de déplacement non trouvé." });
    }

    res.json({ message: "Taux de déplacement supprimé avec succès." });
  } catch (err) {
    console.error("DELETE /users/me/carloans/:libelle error →", err);
    res.status(500).json({ message: "Erreur interne." });
  }
};
