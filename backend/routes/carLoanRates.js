const express = require("express");
const router = express.Router();
const { CarLoan, User } = require("../models");
const authMiddleware = require("../middleware/authMiddleware");

// GET all car-loan rates
router.get("/", authMiddleware, async (req, res) => {
  try {
    console.log("Fetching car-loan rates...");

    const carLoanRates = await CarLoan.findAll({
      include: [
        {
          model: User,
          as: "user", // ↪ must match CarLoan.belongsTo(User, { as: "user", … })
          attributes: ["id", "nomComplete", "courriel"],
        },
      ],
      order: [["dateCreation", "DESC"]],
    });

    console.log(`Found ${carLoanRates.length} car-loan rates`);
    res.json(carLoanRates);
  } catch (error) {
    console.error("Error fetching car-loan rates:", error);
    res.status(500).json({
      message: "Error fetching car-loan rates",
      error: error.message,
    });
  }
});

// PATCH update a car-loan rate's status
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { statut, approuveParGestionnaireId } = req.body;

    console.log(`Updating car-loan rate ${id} → statut: ${statut}`);

    // Validate statut
    const validStatuses = ["en_attente", "approuvé", "rejeté"];
    if (!validStatuses.includes(statut)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the CarLoan entry
    const carLoan = await CarLoan.findByPk(id);
    if (!carLoan) {
      return res.status(404).json({ message: "Car-loan rate not found" });
    }

    // Update fields
    await carLoan.update({
      statut,
      approuveParGestionnaireId,
      dateModification: new Date(),
    });

    // Re-fetch (with the included User) to return to front-end
    const updatedCarLoan = await CarLoan.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "nomComplete", "courriel"],
        },
      ],
    });

    console.log("Car-loan rate updated successfully");
    res.json(updatedCarLoan);
  } catch (error) {
    console.error("Error updating car-loan rate status:", error);
    res.status(500).json({
      message: "Error updating car-loan rate status",
      error: error.message,
    });
  }
});

module.exports = router;
