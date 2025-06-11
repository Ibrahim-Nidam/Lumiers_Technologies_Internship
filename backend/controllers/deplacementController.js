const { Deplacement, Depense, TypeDeDeplacement, TypeDepense, Sequelize } = require("../models")
const { Op } = Sequelize

exports.getDeplacements = async (req, res) => {
  try {
    console.log("📅 Fetching deplacements with query:", req.query)
    console.log("👤 User from middleware:", req.user)

    // Check if user exists
    if (!req.user || !req.user.userId) {
      console.error("❌ No user found in request")
      return res.status(401).json({ error: "User not authenticated" })
    }

    const { month } = req.query
    const where = { userId: req.user.userId }

    if (month) {
      const monthRegex = /^\d{4}-\d{2}$/
      if (!monthRegex.test(month)) {
        return res.status(400).json({ error: "Invalid month format. Use YYYY-MM" })
      }
      const [year, monthNum] = month.split("-").map(Number)
      if (isNaN(year) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ error: "Invalid year or month" })
      }
      const startDate = new Date(year, monthNum - 1, 1)
      const endDate = new Date(year, monthNum, 0)
      where.date = {
        [Op.gte]: startDate.toISOString().split("T")[0],
        [Op.lte]: endDate.toISOString().split("T")[0],
      }
    }

    const deplacements = await Deplacement.findAll({
      where,
      include: [
        {
          model: Depense,
          as: "depenses",
          required: false,
          include: [
            {
              model: TypeDepense,
              as: "typeDepense",
            },
          ],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
        },
      ],
      order: [["date", "ASC"]],
    })

    console.log(`✅ Found ${deplacements.length} deplacements for user ${req.user.userId}`)
    res.json(deplacements)
  } catch (error) {
    console.error("❌ Error fetching deplacements:", error)
    res.status(500).json({
      error: "Failed to fetch deplacements",
      message: error.message,
    })
  }
}

exports.createDeplacement = async (req, res) => {
  try {
    console.log("➕ Creating new deplacement:", req.body)
    console.log("👤 User from middleware:", req.user)

    // Check if user exists
    if (!req.user || !req.user.userId) {
      console.error("❌ No user found in request")
      return res.status(401).json({ error: "User not authenticated" })
    }

    const { typeDeDeplacementId, date, intitule, libelleDestination, codeChantier, distanceKm, depenses } = req.body

    if (!typeDeDeplacementId || !date) {
      return res.status(400).json({
        error: "Missing required fields: typeDeDeplacementId, date",
      })
    }

    const deplacement = await Deplacement.create({
      userId: req.user.userId,
      typeDeDeplacementId,
      date,
      intitule: intitule || "Nouveau déplacement",
      libelleDestination: libelleDestination || "",
      codeChantier: codeChantier || "",
      distanceKm: distanceKm || 0,
    })

    if (Array.isArray(depenses)) {
      await Promise.all(depenses.map((d) => Depense.create({ ...d, deplacementId: deplacement.id })))
    }

    const full = await Deplacement.findByPk(deplacement.id, {
      include: [
        {
          model: Depense,
          as: "depenses",
          required: false,
          include: [
            {
              model: TypeDepense,
              as: "typeDepense",
            },
          ],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
        },
      ],
    })

    console.log("✅ Deplacement created successfully")
    res.status(201).json(full)
  } catch (error) {
    console.error("❌ Error creating deplacement:", error)
    res.status(400).json({
      error: "Failed to create deplacement",
      message: error.message,
    })
  }
}

exports.updateDeplacement = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`📝 Updating deplacement ${id}:`, req.body)
    console.log("👤 User from middleware:", req.user)

    // Check if user exists
    if (!req.user || !req.user.userId) {
      console.error("❌ No user found in request")
      return res.status(401).json({ error: "User not authenticated" })
    }

    const { intitule, libelleDestination, typeDeDeplacementId, date, distanceKm, codeChantier, depenses } = req.body

    const dpl = await Deplacement.findOne({ where: { id, userId: req.user.userId } })
    if (!dpl) return res.status(404).json({ error: "Deplacement not found or not authorized" })

    // Update the main deplacement fields
    await dpl.update({
      intitule,
      libelleDestination,
      typeDeDeplacementId,
      date,
      distanceKm,
      codeChantier,
    })

    // Handle expenses if provided
    if (depenses !== undefined) {
      // Delete existing expenses
      await Depense.destroy({ where: { deplacementId: id } })

      // Create new expenses if any
      if (Array.isArray(depenses) && depenses.length > 0) {
        const expensePromises = depenses.map((expense) => {
          // Validate expense data
          const expenseData = {
            deplacementId: id,
            typeDepenseId: expense.typeDepenseId,
            montant: expense.montant || 0, // Default to 0 if not provided
            cheminJustificatif: expense.cheminJustificatif || null,
          }

          // Validate required fields
          if (!expenseData.typeDepenseId) {
            throw new Error("typeDepenseId is required for expense")
          }

          return Depense.create(expenseData)
        })

        await Promise.all(expensePromises)
      }
    }

    // Fetch the updated deplacement with all associations
    const updated = await Deplacement.findByPk(id, {
      include: [
        {
          model: Depense,
          as: "depenses",
          required: false,
          include: [
            {
              model: TypeDepense,
              as: "typeDepense",
            },
          ],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
        },
      ],
    })

    console.log("✅ Deplacement updated successfully")
    res.json(updated)
  } catch (error) {
    console.error("❌ Error updating deplacement:", error)
    res.status(400).json({
      error: "Failed to update deplacement",
      message: error.message,
    })
  }
}

exports.deleteDeplacement = async (req, res) => {
  try {
    const { id } = req.params
    console.log(`🗑️ Deleting deplacement ${id}`)
    console.log("👤 User from middleware:", req.user)

    // Check if user exists
    if (!req.user || !req.user.userId) {
      console.error("❌ No user found in request")
      return res.status(401).json({ error: "User not authenticated" })
    }

    const dpl = await Deplacement.findOne({ where: { id, userId: req.user.userId } })
    if (!dpl) return res.status(404).json({ error: "Deplacement not found or not authorized" })

    await Depense.destroy({ where: { deplacementId: id } })
    await dpl.destroy()

    console.log("✅ Deplacement deleted successfully")
    res.json({ message: "Deplacement deleted successfully" })
  } catch (error) {
    console.error("❌ Error deleting deplacement:", error)
    res.status(500).json({
      error: "Failed to delete deplacement",
      message: error.message,
    })
  }
}
