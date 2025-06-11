const { TauxMissionUtilisateur, TypeDeDeplacement } = require("../models");
const { Op } = require("sequelize");

const getUserId = req => req.user.userId;

// Fetch all
exports.getAllUserDailyReturns = async (req, res) => {
  const userId = getUserId(req);
  try {
    const dailyReturns = await TauxMissionUtilisateur.findAll({
      where: { userId },
      include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement" }],
      order: [["dateCreation", "DESC"]],
    });
    res.json(dailyReturns);
  } catch {
    res.status(500).json({ error: "Failed to fetch daily returns." });
  }
};

// Create: block ANY existing of same type
exports.createDailyReturn = async (req, res) => {
  const userId = getUserId(req);
  const { typeDeDeplacementId, tarifParJour } = req.body;
  if (!typeDeDeplacementId || !tarifParJour) {
    return res.status(400).json({ error: "Type et tarif sont requis." });
  }
  const tarif = parseFloat(tarifParJour);
  if (isNaN(tarif) || tarif <= 0) {
    return res.status(400).json({ error: "Tarif doit être un nombre positif." });
  }

  try {
    const typeExists = await TypeDeDeplacement.findByPk(typeDeDeplacementId);
    if (!typeExists) {
      return res.status(404).json({ error: "Type introuvable." });
    }

    // **ANY** existing record of this type blocks creation
    const existing = await TauxMissionUtilisateur.findOne({
      where: { userId, typeDeDeplacementId }
    });
    if (existing) {
      return res.status(409).json({
        error: "Vous avez déjà une indemnité pour ce type de déplacement."
      });
    }

    const newDR = await TauxMissionUtilisateur.create({
      userId,
      typeDeDeplacementId,
      tarifParJour: tarif,
      statut: "en_attente",
      dateCreation: new Date(),
      dateModification: new Date()
    });
    res.status(201).json(newDR);
  } catch {
    res.status(500).json({ error: "Échec de la création." });
  }
};

// Update: always reset to en_attente & block duplicate types
exports.updateDailyReturn = async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { typeDeDeplacementId, tarifParJour } = req.body;
  if (!typeDeDeplacementId && !tarifParJour) {
    return res.status(400).json({ error: "Rien à mettre à jour." });
  }
  if (tarifParJour) {
    const tarif = parseFloat(tarifParJour);
    if (isNaN(tarif) || tarif <= 0) {
      return res.status(400).json({ error: "Tarif doit être positif si fourni." });
    }
  }

  try {
    const dr = await TauxMissionUtilisateur.findOne({ where: { id, userId } });
    if (!dr) {
      return res.status(404).json({ error: "Indemnité introuvable ou pas de permission." });
    }

    // If changing type, ensure no OTHER record uses it
    if (typeDeDeplacementId && typeDeDeplacementId !== dr.typeDeDeplacementId) {
      const typeExists = await TypeDeDeplacement.findByPk(typeDeDeplacementId);
      if (!typeExists) {
        return res.status(404).json({ error: "Type introuvable." });
      }
      const conflict = await TauxMissionUtilisateur.findOne({
        where: {
          userId,
          typeDeDeplacementId,
          id: { [Op.ne]: id }
        }
      });
      if (conflict) {
        return res.status(409).json({
          error: "Vous avez déjà une indemnité pour ce type."
        });
      }
      dr.typeDeDeplacementId = typeDeDeplacementId;
    }

    if (tarifParJour) {
      dr.tarifParJour = parseFloat(tarifParJour);
    }

    // **Always** reset back to pending
    dr.statut = "en_attente";
    dr.dateModification = new Date();

    await dr.save();
    res.json(dr);
  } catch {
    res.status(500).json({ error: "Échec de la mise à jour." });
  }
};

// Delete: approved or not, just remove
exports.deleteDailyReturn = async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  try {
    const dr = await TauxMissionUtilisateur.findOne({ where: { id, userId } });
    if (!dr) {
      return res.status(404).json({ error: "Introuvable ou pas de permission." });
    }
    await dr.destroy();
    res.json({ message: "Indemnité supprimée." });
  } catch {
    res.status(500).json({ error: "Échec de la suppression." });
  }
};
