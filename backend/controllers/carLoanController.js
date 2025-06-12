const { CarLoan, User } = require("../models")

// ─────────────────────────────────────────────────────────────
// GET all car-loan rates (for admin)
// ─────────────────────────────────────────────────────────────
exports.getAllCarLoans = async (req, res) => {
  try {
    const carLoanRates = await CarLoan.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
      ],
      order: [["dateCreation", "DESC"]],
    })

    res.json(carLoanRates)
  } catch (error) {
    console.error("Error fetching car-loan rates:", error)
    res.status(500).json({
      message: "Error fetching car-loan rates",
      error: error.message,
    })
  }
}

// ─────────────────────────────────────────────────────────────
// GET user-specific approved car loans
// ─────────────────────────────────────────────────────────────
exports.getUserCarLoans = async (req, res) => {
  try {
    const userId = req.user.userId

    console.log(`🔍 Fetching approved car loans for user ${userId}`)
    console.log("User ID from request:", userId)
    const userCarLoans = await CarLoan.findAll({
      where: {
        userId: userId,
        statut: "approuvé",
      },
      order: [["dateCreation", "DESC"]],
    })

    console.log(`✅ Found ${userCarLoans.length} approved car loans for user ${userId}`)
    res.json(userCarLoans)
  } catch (error) {
    console.error("Error fetching user car loans:", error)
    res.status(500).json({
      message: "Error fetching user car loans",
      error: error.message,
    })
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH: Update car-loan rate status
// ─────────────────────────────────────────────────────────────
exports.updateCarLoanStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { statut } = req.body
    const approuveParGestionnaireId = req.user.userId

    const validStatuses = ["en_attente", "approuvé", "rejeté"]
    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ message: "Invalid status" })
    }

    const carLoan = await CarLoan.findByPk(id)
    if (!carLoan) {
      return res.status(404).json({ message: "Car-loan rate not found" })
    }

    await carLoan.update({
      statut,
      approuveParGestionnaireId,
      dateModification: new Date(),
    })

    const updatedCarLoan = await CarLoan.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
      ],
    })

    res.json(updatedCarLoan)
  } catch (error) {
    console.error("Error updating car-loan rate status:", error)
    res.status(500).json({
      message: "Error updating car-loan rate status",
      error: error.message,
    })
  }
}
