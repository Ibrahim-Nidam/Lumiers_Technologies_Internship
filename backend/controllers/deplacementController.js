const {
  Deplacement,
  Depense,
  TypeDeDeplacement,
  TypeDepense,
  Chantier,
  VehiculeRateRule,
  Sequelize,
} = require("../models");
const { Op } = Sequelize;
const fs = require("fs");
const path = require("path");

// ─── READ MANY ────────────────────────────────────────────────────────────────
exports.getDeplacements = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const where = { userId };
    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      where.date = {
        [Op.gte]: `${year}-${String(month).padStart(2, "0")}-01`,
        [Op.lte]: `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`,
      };
    }

    const deplacements = await Deplacement.findAll({
      where,
      order: [["date", "ASC"]],
      include: [
        {
          model: Chantier,
          as: "chantier",
          required: false,
          attributes: ["id", "codeChantier", "designation", "ville"],
          include: [
            {
              model: TypeDeDeplacement,
              as: "typeDeDeplacement",
              attributes: ["id", "nom"],
            },
          ],
        },
        {
          model: VehiculeRateRule,
          as: "vehiculeRateRule",
          required: false,
          attributes: ["id", "name", "conditionType", "rateBeforeThreshold", "rateAfterThreshold", "thresholdKm"],
        },
        {
          model: Depense,
          as: "depenses",
          required: false,
          include: [
            {
              model: TypeDepense,
              as: "typeDepense",
              attributes: ["id", "nom"],
            },
          ],
        },
        {
          model: TypeDeDeplacement,
          as: "typeDeDeplacement",
          attributes: ["id", "nom"],
        },
      ],
    });

    res.json(deplacements);
  } catch (err) {
    console.error("GET /deplacements →", err);
    res.status(500).json({ error: "Failed to fetch deplacements", details: err.message });
  }
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
exports.createDeplacement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const {
      date,
      chantierId,
      typeDeDeplacementId,
      libelleDestination,
      codeChantier,
      distanceKm,
      vehiculeRateRuleId,
      depenses,
    } = req.body;

    if (!date || !typeDeDeplacementId || !libelleDestination || distanceKm == null) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const deplacement = await Deplacement.create({
      userId,
      date,
      chantierId: chantierId || null,
      typeDeDeplacementId,
      libelleDestination,
      codeChantier: codeChantier || null,
      distanceKm,
      vehiculeRateRuleId: vehiculeRateRuleId || null,
    });

    if (Array.isArray(depenses)) {
      await Promise.all(depenses.map(d =>
        Depense.create({
          deplacementId: deplacement.id,
          typeDepenseId: d.typeDepenseId || null,
          montant: d.montant,
          cheminJustificatif: d.cheminJustificatif || null,
        })
      ));
    }

    // Return full object
    const full = await Deplacement.findByPk(deplacement.id, {
      include: [
        { model: Chantier, as: "chantier", include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement" }] },
        { model: VehiculeRateRule, as: "vehiculeRateRule" },
        { model: Depense, as: "depenses", include: [{ model: TypeDepense, as: "typeDepense" }] },
        { model: TypeDeDeplacement, as: "typeDeDeplacement" },
      ],
    });

    res.status(201).json(full);
  } catch (err) {
    console.error("POST /deplacements →", err);
    res.status(400).json({ error: "Failed to create deplacement", details: err.message });
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
exports.updateDeplacement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deplacement = await Deplacement.findOne({ where: { id, userId } });
    if (!deplacement) {
      return res.status(404).json({ error: "Deplacement not found" });
    }

    const {
      date,
      chantierId,
      typeDeDeplacementId,
      libelleDestination,
      codeChantier,
      distanceKm,
      vehiculeRateRuleId,
      depenses,
    } = req.body;

    const updateData = {};
    if (date !== undefined) updateData.date = date;
    if (chantierId !== undefined) updateData.chantierId = chantierId;
    if (typeDeDeplacementId !== undefined) updateData.typeDeDeplacementId = typeDeDeplacementId;
    if (libelleDestination !== undefined) updateData.libelleDestination = libelleDestination;
    if (codeChantier !== undefined) updateData.codeChantier = codeChantier;
    if (distanceKm !== undefined) updateData.distanceKm = distanceKm;
    if (vehiculeRateRuleId !== undefined) updateData.vehiculeRateRuleId = vehiculeRateRuleId;

    await deplacement.update(updateData);

    // Expenses: replace all if provided
    if (depenses !== undefined) {
      await Depense.destroy({ where: { deplacementId: id } });
      if (Array.isArray(depenses)) {
        await Promise.all(depenses.map(d =>
          Depense.create({
            deplacementId: id,
            typeDepenseId: d.typeDepenseId || null,
            montant: d.montant,
            cheminJustificatif: d.cheminJustificatif || null,
          })
        ));
      }
    }

    const updated = await Deplacement.findByPk(id, {
      include: [
        { model: Chantier, as: "chantier", include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement" }] },
        { model: VehiculeRateRule, as: "vehiculeRateRule" },
        { model: Depense, as: "depenses", include: [{ model: TypeDepense, as: "typeDepense" }] },
        { model: TypeDeDeplacement, as: "typeDeDeplacement" },
      ],
    });

    res.json(updated);
  } catch (err) {
    console.error("PUT /deplacements/:id →", err);
    res.status(400).json({ error: "Failed to update deplacement", details: err.message });
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
exports.deleteDeplacement = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const deplacement = await Deplacement.findOne({ where: { id, userId } });
    if (!deplacement) {
      return res.status(404).json({ error: "Deplacement not found" });
    }

    await Depense.destroy({ where: { deplacementId: id } });
    await deplacement.destroy();
    res.json({ message: "Deplacement deleted successfully" });
  } catch (err) {
    console.error("DELETE /deplacements/:id →", err);
    res.status(500).json({ error: "Failed to delete deplacement", details: err.message });
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
    console.error("🔥 Error in addExpenseJustificatif:", err); // complet
    console.error(err.stack); // trace complète
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