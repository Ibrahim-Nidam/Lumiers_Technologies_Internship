const express = require("express");
const bcrypt = require("bcrypt");
const { User, Role, CarLoan } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

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
      // fallback: replace underscores and capitalize each word
      return String(statut)
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

// 1) GET /api/roles (publique)
router.get("/roles", async (req, res) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "nom", "description"],
      order: [["id", "ASC"]],
    });
    return res.json(roles);
  } catch (err) {
    console.error("GET /roles error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

// 2) GET /api/users/me (protégé)
router.get("/users/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findOne({
      where: { id: userId },
      attributes: [
        "id",
        "nomComplete",
        "courriel",
        "possedeVoiturePersonnelle",
        // We no longer send roleId because the frontend does not use it:
        // "roleId" has been removed on the front end and cannot be changed.
      ],
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    return res.json({
      id: user.id,
      nomComplete: user.nomComplete,
      courriel: user.courriel,
      possedeVoiturePersonnelle: user.possedeVoiturePersonnelle,
    });
  } catch (err) {
    console.error("GET /users/me error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

// 3) PUT /api/users/me (protégé)
//    Removed `roleId` from destructuring and no longer update it.
router.put("/users/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      nomComplete,
      courriel,
      possedeVoiturePersonnelle,
      motDePasse,
      // Note: roleId is no longer expected here
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable." });
    }

    user.nomComplete = nomComplete.trim();
    user.courriel = courriel.trim();
    user.possedeVoiturePersonnelle = !!possedeVoiturePersonnelle;

    if (motDePasse && motDePasse.length >= 6) {
      const saltRounds = 10;
      const hash = await bcrypt.hash(motDePasse, saltRounds);
      user.motDePasseHache = hash;
    }

    await user.save();
    return res.json({ message: "Profil mis à jour avec succès." });
  } catch (err) {
    console.error("PUT /users/me error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

// 4) GET /api/users/me/carloans (protégé)
//    Now includes `status` (mapped from the `statut` column) in each object.
router.get("/users/me/carloans", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const loans = await CarLoan.findAll({
      where: { userId },
      attributes: ["libelle", "tarifParKm", "statut"],
      order: [["id", "ASC"]],
    });

    return res.json(
      loans.map((l) => ({
        libelle: l.libelle,
        tarifParKm: parseFloat(l.tarifParKm),
        status: formatStatus(l.statut),
      }))
    );
  } catch (err) {
    console.error("GET /users/me/carloans error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

// 5) PUT /api/users/me/carloans (protégé)
router.put("/users/me/carloans", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const incomingArray = Array.isArray(req.body) ? req.body : [];

    // Validation
    for (let entry of incomingArray) {
      if (
        typeof entry.libelle !== "string" ||
        entry.libelle.trim() === "" ||
        typeof entry.tarifParKm !== "number" ||
        entry.tarifParKm <= 1
      ) {
        return res
          .status(400)
          .json({ message: "Format invalide pour Taux de déplacement." });
      }
    }

    // Récupérer tous les taux actuels de l'utilisateur
    const existing = await CarLoan.findAll({ where: { userId } });

    // Créer une map pour y accéder rapidement par libelle
    const existingMap = new Map(
      existing.map((loan) => [loan.libelle.trim(), loan])
    );

    // Marquer les `libelle` reçus
    const receivedLibelles = new Set();

    for (let entry of incomingArray) {
      const libelle = entry.libelle.trim();
      receivedLibelles.add(libelle);

      const existingLoan = existingMap.get(libelle);
      if (existingLoan) {
        // Mettre à jour tarif et statut à "en_attente"
        existingLoan.tarifParKm = entry.tarifParKm;
        existingLoan.statut = "en_attente";
        await existingLoan.save();
      } else {
        // Créer un nouveau taux
        await CarLoan.create({
          userId,
          libelle,
          tarifParKm: entry.tarifParKm,
          statut: "en_attente",
        });
      }
    }

    // Pour tous les anciens libelles non inclus dans la requête, on les remet à "en_attente"
    for (let loan of existing) {
      if (!receivedLibelles.has(loan.libelle.trim())) {
        loan.statut = "en_attente";
        await loan.save();
      }
    }

    return res.json({ message: "Taux de déplacement mis à jour." });
  } catch (err) {
    console.error("PUT /users/me/carloans error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

// 6) DELETE /api/users/me/carloans/:libelle (protégé) - NEW ROUTE
router.delete("/users/me/carloans/:libelle", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { libelle } = req.params;

    if (!libelle || !libelle.trim()) {
      return res.status(400).json({ message: "Libellé requis." });
    }

    // Find and delete the specific car loan
    const deletedCount = await CarLoan.destroy({
      where: { 
        userId, 
        libelle: decodeURIComponent(libelle.trim())
      }
    });

    if (deletedCount === 0) {
      return res.status(404).json({ message: "Taux de déplacement non trouvé." });
    }

    return res.json({ message: "Taux de déplacement supprimé avec succès." });
  } catch (err) {
    console.error("DELETE /users/me/carloans/:libelle error →", err);
    return res.status(500).json({ message: "Erreur interne." });
  }
});

module.exports = router;