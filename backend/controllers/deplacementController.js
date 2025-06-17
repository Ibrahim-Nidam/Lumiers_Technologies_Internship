const {
  Deplacement,
  Depense,
  TypeDeDeplacement,
  TypeDepense,
  TauxMissionUtilisateur,
  CarLoan,
  Sequelize,
} = require("../models")
const { Op } = Sequelize
const path = require("path");
const fs = require("fs")



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
        {
          model: TauxMissionUtilisateur,
          as: "missionRate",
          required: false,
        },
        {
          model: CarLoan,
          as: "carLoan",
          required: false,
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

    const { typeDeDeplacementId, date,  libelleDestination, codeChantier, distanceKm, carLoanId, depenses } =
      req.body

    if (!typeDeDeplacementId || !date || !libelleDestination || !distanceKm) {
      return res.status(400).json({
        error: "Missing required fields: typeDeDeplacementId, date, libelleDestination, distanceKm",
      })
    }

    const deplacement = await Deplacement.create({
      userId: req.user.userId,
      typeDeDeplacementId,
      date,
      libelleDestination,
      codeChantier: codeChantier || null,
      distanceKm,
      carLoanId: carLoanId || null,
    })

    // Create associated expenses if provided
    if (Array.isArray(depenses) && depenses.length > 0) {
      const expensePromises = depenses.map((expense) => {
        // Validate expense data
        if (!expense.montant) {
          throw new Error("montant is required for expense")
        }
        
        return Depense.create({
          deplacementId: deplacement.id,
          typeDepenseId: expense.typeDepenseId || null,
          montant: expense.montant,
          cheminJustificatif: expense.cheminJustificatif || null,
        })
      })
      
      await Promise.all(expensePromises)
    }

    // Fetch the complete deplacement with all associations
    const fullDeplacement = await Deplacement.findByPk(deplacement.id, {
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
        {
          model: TauxMissionUtilisateur,
          as: "missionRate",
          required: false,
        },
        {
          model: CarLoan,
          as: "carLoan",
          required: false,
        },
      ],
    })

    console.log("✅ Deplacement created successfully")
    res.status(201).json(fullDeplacement)
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

    const {  libelleDestination, typeDeDeplacementId, date, distanceKm, codeChantier, carLoanId, depenses } =
      req.body

    const deplacement = await Deplacement.findOne({ where: { id, userId: req.user.userId } })
    if (!deplacement) {
      return res.status(404).json({ error: "Deplacement not found or not authorized" })
    }

    // Update the main deplacement fields (only update provided fields)
    const updateData = {}
    if (libelleDestination !== undefined) updateData.libelleDestination = libelleDestination
    if (typeDeDeplacementId !== undefined) updateData.typeDeDeplacementId = typeDeDeplacementId
    if (date !== undefined) updateData.date = date
    if (distanceKm !== undefined) updateData.distanceKm = distanceKm
    if (codeChantier !== undefined) updateData.codeChantier = codeChantier
    if (carLoanId !== undefined) updateData.carLoanId = carLoanId

    await deplacement.update(updateData)

    // Handle expenses if provided
    if (depenses !== undefined) {
      // Delete existing expenses
      await Depense.destroy({ where: { deplacementId: id } })

      // Create new expenses if any
      if (Array.isArray(depenses) && depenses.length > 0) {
        const expensePromises = depenses.map((expense) => {
          // Validate expense data
          if (expense.montant === undefined || expense.montant === null) {
            throw new Error("montant is required for expense")
          }          

          return Depense.create({
            deplacementId: id,
            typeDepenseId: expense.typeDepenseId || null,
            montant: expense.montant,
            cheminJustificatif: expense.cheminJustificatif || null,
          })
        })

        await Promise.all(expensePromises)
      }
    }

    // Fetch the updated deplacement with all associations
    const updatedDeplacement = await Deplacement.findByPk(id, {
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
        {
          model: TauxMissionUtilisateur,
          as: "missionRate",
          required: false,
        },
        {
          model: CarLoan,
          as: "carLoan",
          required: false,
        },
      ],
    })

    console.log("✅ Deplacement updated successfully")
    res.json(updatedDeplacement)
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

    const deplacement = await Deplacement.findOne({ where: { id, userId: req.user.userId } })
    if (!deplacement) {
      return res.status(404).json({ error: "Deplacement not found or not authorized" })
    }

    // Delete associated expenses first (due to foreign key constraints)
    await Depense.destroy({ where: { deplacementId: id } })
    
    // Then delete the deplacement
    await deplacement.destroy()

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

exports.addExpenseJustificatif = async (req, res) => {
  const { tripId, expenseId } = req.params;
  console.log("→ Incoming file upload:", { tripId, expenseId, file: req.file });

  if (!req.file) {
    console.error("No file on req.file");
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    // verify file actually landed on disk
    const uploadPath = path.join(__dirname, "../uploads", req.file.filename);
    if (!fs.existsSync(uploadPath)) {
      console.error("Uploaded file not found at:", uploadPath);
      return res.status(500).json({ error: "File saved but not found." });
    }

    // find the expense
    const expense = await Depense.findOne({
      where: { id: expenseId, deplacementId: tripId },
    });
    if (!expense) {
      console.error("Expense not found for trip", tripId, "and expense", expenseId);
      return res.status(404).json({ error: "Expense not found." });
    }

    // update the DB record
    expense.cheminJustificatif = `/uploads/${req.file.filename}`;
    await expense.save();

    console.log("→ Expense updated successfully:", expense.toJSON());
    res.json(expense);
  } catch (err) {
    console.error("🔥 Error in addExpenseJustificatif:", err);
    res.status(500).json({ error: "Server error.", details: err.message });
  }
};

exports.removeExpenseJustificatif = async (req, res) => {
  const { tripId, expenseId } = req.params;

  try {
    // 1) find the expense
    const expense = await Depense.findOne({
      where: { id: expenseId, deplacementId: tripId },
    });
    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    // 2) if there is a file, delete it from disk
    if (expense.cheminJustificatif) {
      // cheminJustificatif is something like "/uploads/justificatif-123456789.pdf"
      const filePath = path.join(
        __dirname,
        "..",
        expense.cheminJustificatif.replace(/^\//, "")
      );
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") {
          console.error("Failed to delete file:", err);
        }
      });
    }

    // 3) null out the DB field
    expense.cheminJustificatif = null;
    await expense.save();

    return res.json({ message: "Justificatif removed." });
  } catch (err) {
    console.error("Error in removeExpenseJustificatif:", err);
    return res.status(500).json({ error: "Server error." });
  }
};