const { TauxMissionUtilisateur, User, TypeDeDeplacement } = require("../models");

// ─────────────────────────────────────────────────────────────
// GET All Mission Rates
// ─────────────────────────────────────────────────────────────
exports.getAllMissionRates = async (req, res) => {
  try {
    const missionRates = await TauxMissionUtilisateur.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
          attributes: ["id", "nom", "description"],
        },
      ],
      order: [["dateCreation", "DESC"]],
    });

    res.json(missionRates);
  } catch (error) {
    console.error("Error fetching mission rates:", error);
    res.status(500).json({
      message: "Error fetching mission rates",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH Update Mission Rate Status
// ─────────────────────────────────────────────────────────────
exports.updateMissionRateStatus = async (req, res) => {
  const { id } = req.params;
  const { statut, approuveParGestionnaireId } = req.body;

  const validStatuses = ["en_attente", "approuvé", "rejeté"];
  if (!validStatuses.includes(statut)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  try {
    const missionRate = await TauxMissionUtilisateur.findByPk(id);
    if (!missionRate) {
      return res.status(404).json({ message: "Mission rate not found" });
    }

    await missionRate.update({
      statut,
      approuveParGestionnaireId,
      dateModification: new Date(),
    });

    const updated = await TauxMissionUtilisateur.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
          attributes: ["id", "nom", "description"],
        },
      ],
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating mission rate status:", error);
    res.status(500).json({
      message: "Error updating mission rate status",
      error: error.message,
    });
  }
};
