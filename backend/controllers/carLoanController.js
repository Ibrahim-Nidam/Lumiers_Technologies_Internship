const { CarLoan, User } = require("../models");

// ─────────────────────────────────────────────────────────────
// GET all car-loan rates
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
    });

    res.json(carLoanRates);
  } catch (error) {
    console.error("Error fetching car-loan rates:", error);
    res.status(500).json({
      message: "Error fetching car-loan rates",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH: Update car-loan rate status
// ─────────────────────────────────────────────────────────────
exports.updateCarLoanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, approuveParGestionnaireId } = req.body;


    const validStatuses = ["en_attente", "approuvé", "rejeté"];
    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const carLoan = await CarLoan.findByPk(id);
    if (!carLoan) {
      return res.status(404).json({ message: "Car-loan rate not found" });
    }

    await carLoan.update({
      statut,
      approuveParGestionnaireId,
      dateModification: new Date(),
    });

    const updatedCarLoan = await CarLoan.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
      ],
    });

    res.json(updatedCarLoan);
  } catch (error) {
    console.error("Error updating car-loan rate status:", error);
    res.status(500).json({
      message: "Error updating car-loan rate status",
      error: error.message,
    });
  }
};
