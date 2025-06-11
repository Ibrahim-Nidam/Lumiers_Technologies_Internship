const { TauxMissionUtilisateur, TypeDeDeplacement } = require("../models")
const { Op } = require("sequelize")

const getUserId = (req) => req.user.userId

// Fetch all user's daily returns
exports.getAllUserDailyReturns = async (req, res) => {
  const userId = getUserId(req)
  try {
    const dailyReturns = await TauxMissionUtilisateur.findAll({
      where: { userId },
      include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement" }],
      order: [["dateCreation", "DESC"]],
    })
    res.json(dailyReturns)
  } catch (error) {
    console.error("Error fetching daily returns:", error)
    res.status(500).json({ error: "Failed to fetch daily returns." })
  }
}

// Get user's approved daily returns only (for the dashboard)
exports.getUserApprovedDailyReturns = async (req, res) => {
  try {
    const userId = req.user.userId

    console.log(`🔍 Fetching approved daily returns for user ${userId}`)

    const approvedReturns = await TauxMissionUtilisateur.findAll({
      where: {
        userId: userId,
        statut: "approuvé",
      },
      include: [
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
          attributes: ["id", "nom", "description"],
        },
      ],
      order: [["dateCreation", "DESC"]],
    })

    console.log(`✅ Found ${approvedReturns.length} approved daily returns for user ${userId}`)
    res.json(approvedReturns)
  } catch (error) {
    console.error("Error fetching user approved daily returns:", error)
    res.status(500).json({
      message: "Error fetching user approved daily returns",
      error: error.message,
    })
  }
}

// Create: block ANY existing of same type
exports.createDailyReturn = async (req, res) => {
  const userId = getUserId(req)
  const { typeDeDeplacementId, tarifParJour } = req.body
  if (!typeDeDeplacementId || !tarifParJour) {
    return res.status(400).json({ error: "Type et tarif sont requis." })
  }
  const tarif = Number.parseFloat(tarifParJour)
  if (isNaN(tarif) || tarif <= 0) {
    return res.status(400).json({ error: "Tarif doit être un nombre positif." })
  }

  try {
    const typeExists = await TypeDeDeplacement.findByPk(typeDeDeplacementId)
    if (!typeExists) {
      return res.status(404).json({ error: "Type introuvable." })
    }

    // **ANY** existing record of this type blocks creation
    const existing = await TauxMissionUtilisateur.findOne({
      where: { userId, typeDeDeplacementId },
    })
    if (existing) {
      return res.status(409).json({
        error: "Vous avez déjà une indemnité pour ce type de déplacement.",
      })
    }

    const newDR = await TauxMissionUtilisateur.create({
      userId,
      typeDeDeplacementId,
      tarifParJour: tarif,
      statut: "en_attente",
      dateCreation: new Date(),
      dateModification: new Date(),
    })
    res.status(201).json(newDR)
  } catch (error) {
    console.error("Error creating daily return:", error)
    res.status(500).json({ error: "Échec de la création." })
  }
}

// Update: always reset to en_attente & block duplicate types
exports.updateDailyReturn = async (req, res) => {
  const userId = getUserId(req)
  const { id } = req.params
  const { typeDeDeplacementId, tarifParJour } = req.body
  if (!typeDeDeplacementId && !tarifParJour) {
    return res.status(400).json({ error: "Rien à mettre à jour." })
  }
  if (tarifParJour) {
    const tarif = Number.parseFloat(tarifParJour)
    if (isNaN(tarif) || tarif <= 0) {
      return res.status(400).json({ error: "Tarif doit être positif si fourni." })
    }
  }

  try {
    const dr = await TauxMissionUtilisateur.findOne({ where: { id, userId } })
    if (!dr) {
      return res.status(404).json({ error: "Indemnité introuvable ou pas de permission." })
    }

    // If changing type, ensure no OTHER record uses it
    if (typeDeDeplacementId && typeDeDeplacementId !== dr.typeDeDeplacementId) {
      const typeExists = await TypeDeDeplacement.findByPk(typeDeDeplacementId)
      if (!typeExists) {
        return res.status(404).json({ error: "Type introuvable." })
      }
      const conflict = await TauxMissionUtilisateur.findOne({
        where: {
          userId,
          typeDeDeplacementId,
          id: { [Op.ne]: id },
        },
      })
      if (conflict) {
        return res.status(409).json({
          error: "Vous avez déjà une indemnité pour ce type.",
        })
      }
      dr.typeDeDeplacementId = typeDeDeplacementId
    }

    if (tarifParJour) {
      dr.tarifParJour = Number.parseFloat(tarifParJour)
    }

    // **Always** reset back to pending
    dr.statut = "en_attente"
    dr.dateModification = new Date()

    await dr.save()
    res.json(dr)
  } catch (error) {
    console.error("Error updating daily return:", error)
    res.status(500).json({ error: "Échec de la mise à jour." })
  }
}

// Delete: approved or not, just remove
exports.deleteDailyReturn = async (req, res) => {
  const userId = getUserId(req)
  const { id } = req.params
  try {
    const dr = await TauxMissionUtilisateur.findOne({ where: { id, userId } })
    if (!dr) {
      return res.status(404).json({ error: "Introuvable ou pas de permission." })
    }
    await dr.destroy()
    res.json({ message: "Indemnité supprimée." })
  } catch (error) {
    console.error("Error deleting daily return:", error)
    res.status(500).json({ error: "Échec de la suppression." })
  }
}
