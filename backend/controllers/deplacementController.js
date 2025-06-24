const {
  Deplacement,
  Depense,
  TypeDeDeplacement,
  TypeDepense,
  Chantier,
  VehiculeRateRule,
  User,
  Sequelize,
} = require("../models");
const { Op } = Sequelize;
const fs = require("fs");
const path = require("path");

// Helper to get effective userId (owner of the trip)
const getEffectiveUserId = (req) => {
  return req.targetUserId || req.user?.userId;
};

// Helper to get the actual user performing the action
const getActingUserId = (req) => {
  return req.user?.userId;
};

// ─── READ MANY ────────────────────────────────────────────────────────────────
exports.getDeplacements = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) return res.status(401).json({ error: "User not authenticated" });

    const effectiveUserId = getEffectiveUserId(req);
    const where = { userId: effectiveUserId };

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

    let response = deplacements;
    if (req.isManagerAccess) {
      const targetUser = await User.findByPk(effectiveUserId, {
        attributes: ["id", "nomComplete", "courriel"],
      });
      response = {
        deplacements,
        userInfo: targetUser,
        isManagerView: true,
      };
    }

    res.json(response);
  } catch (err) {
    console.error("GET /deplacements →", err);
    res.status(500).json({ error: "Failed to fetch deplacements", details: err.message });
  }
};

// ─── READ BY USER ID ─────────────────────────────────────────────────────────────
exports.getDeplacementsByUserId = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) return res.status(401).json({ error: "User not authenticated" });

    const targetUserId = parseInt(req.params.userId);
    const where = { userId: targetUserId };

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

    const targetUser = await User.findByPk(targetUserId, {
      attributes: ["id", "nomComplete", "courriel"],
    });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    res.json({
      deplacements,
      userInfo: targetUser,
      isManagerView: true,
    });
  } catch (err) {
    console.error("GET /deplacements/user/:userId →", err);
    res.status(500).json({ error: "Failed to fetch user deplacements", details: err.message });
  }
};

// ─── CREATE ─────────────────────────────────────────────────────────────────────
exports.createDeplacement = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) return res.status(401).json({ error: "User not authenticated" });

    const effectiveUserId = getEffectiveUserId(req); // Owner of the trip
    const actingUserId = getActingUserId(req); // User performing the action

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

    const deplacementData = {
      userId: effectiveUserId, // Always the owner of the trip
      date,
      chantierId: chantierId || null,
      typeDeDeplacementId,
      libelleDestination,
      codeChantier: codeChantier || null,
      distanceKm,
      vehiculeRateRuleId: vehiculeRateRuleId || null,
    };

    // Only set createdBy if someone other than the owner is creating the trip
    if (actingUserId !== effectiveUserId) {
      deplacementData.createdBy = actingUserId;
    }

    const deplacement = await Deplacement.create(deplacementData);

    if (Array.isArray(depenses)) {
      await Promise.all(
        depenses.map((d) => {
          const expenseData = {
            deplacementId: deplacement.id,
            typeDepenseId: d.typeDepenseId || null,
            montant: d.montant,
            cheminJustificatif: d.cheminJustificatif || null,
          };

          // Only set createdBy if someone other than the owner is creating the expense
          if (actingUserId !== effectiveUserId) {
            expenseData.createdBy = actingUserId;
          }

          return Depense.create(expenseData);
        })
      );
    }

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

// ─── UPDATE ─────────────────────────────────────────────────────────────────────
exports.updateDeplacement = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    const { id } = req.params;
    if (!currentUserId) return res.status(401).json({ error: "User not authenticated" });

    const effectiveUserId = getEffectiveUserId(req); // Owner of the trip
    const actingUserId = getActingUserId(req); // User performing the action

    const deplacement = await Deplacement.findOne({
      where: { id, userId: effectiveUserId },
    });
    if (!deplacement) return res.status(404).json({ error: "Deplacement not found" });

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

    // Check if any deplacement fields actually changed
    let deplacementChanged = false;
    const updateData = {};
    
    if (date !== undefined && date !== deplacement.date) {
      updateData.date = date;
      deplacementChanged = true;
    }
    if (chantierId !== undefined && chantierId !== deplacement.chantierId) {
      updateData.chantierId = chantierId;
      deplacementChanged = true;
    }
    if (typeDeDeplacementId !== undefined && typeDeDeplacementId !== deplacement.typeDeDeplacementId) {
      updateData.typeDeDeplacementId = typeDeDeplacementId;
      deplacementChanged = true;
    }
    if (libelleDestination !== undefined && libelleDestination !== deplacement.libelleDestination) {
      updateData.libelleDestination = libelleDestination;
      deplacementChanged = true;
    }
    if (codeChantier !== undefined && codeChantier !== deplacement.codeChantier) {
      updateData.codeChantier = codeChantier;
      deplacementChanged = true;
    }
    if (distanceKm !== undefined && parseFloat(distanceKm) !== parseFloat(deplacement.distanceKm)) {
      updateData.distanceKm = distanceKm;
      deplacementChanged = true;
    }
    if (vehiculeRateRuleId !== undefined && vehiculeRateRuleId !== deplacement.vehiculeRateRuleId) {
      updateData.vehiculeRateRuleId = vehiculeRateRuleId;
      deplacementChanged = true;
    }

    // Only update modifiedBy if something actually changed
    if (deplacementChanged) {
      if (actingUserId !== effectiveUserId) {
        // Manager is making changes - set modifiedBy
        updateData.modifiedBy = actingUserId;
      } else {
        // Owner is making changes - clear modifiedBy (owner reclaimed control)
        updateData.modifiedBy = null;
      }
    }

    // Update deplacement only if there were changes
    if (Object.keys(updateData).length > 0) {
      await deplacement.update(updateData);
    }

    // Handle expenses individually - only update those that actually changed
    if (depenses !== undefined && Array.isArray(depenses)) {
      // Get existing expenses
      const existingExpenses = await Depense.findAll({ 
        where: { deplacementId: id },
        order: [['id', 'ASC']]
      });

      // Process each expense in the request
      for (let i = 0; i < depenses.length; i++) {
        const expenseData = depenses[i];
        
        if (i < existingExpenses.length) {
          // Update existing expense - but only if values actually changed
          const existingExpense = existingExpenses[i];
          let expenseChanged = false;
          const expenseUpdateData = {};
          
          // Check each field for changes
          if (expenseData.typeDepenseId !== existingExpense.typeDepenseId) {
            expenseUpdateData.typeDepenseId = expenseData.typeDepenseId || null;
            expenseChanged = true;
          }
          
          if (parseFloat(expenseData.montant) !== parseFloat(existingExpense.montant)) {
            expenseUpdateData.montant = expenseData.montant;
            expenseChanged = true;
          }
          
          // Only update cheminJustificatif if it's explicitly provided and different
          if (expenseData.cheminJustificatif !== undefined && 
              expenseData.cheminJustificatif !== existingExpense.cheminJustificatif) {
            expenseUpdateData.cheminJustificatif = expenseData.cheminJustificatif;
            expenseChanged = true;
          }
          
          // Only set modifiedBy if something actually changed
          if (expenseChanged) {
            if (actingUserId !== effectiveUserId) {
              // Manager is making changes - set modifiedBy
              expenseUpdateData.modifiedBy = actingUserId;
            } else {
              // Owner is making changes - clear modifiedBy (owner reclaimed control)
              expenseUpdateData.modifiedBy = null;
            }
            
            await existingExpense.update(expenseUpdateData);
          }
        } else {
          // Create new expense
          const newExpenseData = {
            deplacementId: id,
            typeDepenseId: expenseData.typeDepenseId || null,
            montant: expenseData.montant,
            cheminJustificatif: expenseData.cheminJustificatif || null,
          };
          
          // Only set createdBy if someone other than the owner is creating
          if (actingUserId !== effectiveUserId) {
            newExpenseData.createdBy = actingUserId;
          }
          
          await Depense.create(newExpenseData);
        }
      }

      // Remove any extra existing expenses
      if (existingExpenses.length > depenses.length) {
        const expensesToDelete = existingExpenses.slice(depenses.length);
        await Promise.all(
          expensesToDelete.map(expense => expense.destroy())
        );
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

// ─── DELETE ─────────────────────────────────────────────────────────────────────
exports.deleteDeplacement = async (req, res) => {
  try {
    const currentUserId = req.user?.userId;
    const { id } = req.params;
    if (!currentUserId) return res.status(401).json({ error: "User not authenticated" });

    const effectiveUserId = getEffectiveUserId(req);

    const deplacement = await Deplacement.findOne({
      where: { id, userId: effectiveUserId },
    });
    if (!deplacement) return res.status(404).json({ error: "Deplacement not found" });

    await Depense.destroy({ where: { deplacementId: id } });
    await deplacement.destroy();

    res.json({ message: "Deplacement deleted successfully" });
  } catch (err) {
    console.error("DELETE /deplacements/:id →", err);
    res.status(500).json({ error: "Failed to delete deplacement", details: err.message });
  }
};

// ─── FILE UPLOAD/REMOVAL ─────────────────────────────────────────────────────────
exports.addExpenseJustificatif = async (req, res) => {
  const { tripId, expenseId } = req.params;
  const actingUserId = getActingUserId(req);
  const effectiveUserId = getEffectiveUserId(req);
  

  if (!req.file) {
    console.error("No file on req.file");
    return res.status(400).json({ error: "No file uploaded." });
  }

  try {
    const uploadPath = path.join(__dirname, "../uploads", req.file.filename);
    if (!fs.existsSync(uploadPath)) {
      console.error("Uploaded file not found at:", uploadPath);
      return res.status(500).json({ error: "File saved but not found." });
    }

    const expense = await Depense.findOne({
      where: { id: expenseId, deplacementId: tripId },
    });
    if (!expense) {
      console.error("Expense not found for trip", tripId, "and expense", expenseId);
      return res.status(404).json({ error: "Expense not found." });
    }

    const updateData = {
      cheminJustificatif: `/uploads/${req.file.filename}`
    };

    // Only set modifiedBy if someone other than the owner is uploading the file
    if (actingUserId !== effectiveUserId) {
      updateData.modifiedBy = actingUserId;
    }

    await expense.update(updateData);

    res.json(expense);
  } catch (err) {
    console.error("🔥 Error in addExpenseJustificatif:", err);
    console.error(err.stack);
    res.status(500).json({ error: "Server error.", details: err.message });
  }
};

exports.removeExpenseJustificatif = async (req, res) => {
  const { tripId, expenseId } = req.params;
  const actingUserId = getActingUserId(req);
  const effectiveUserId = getEffectiveUserId(req);

  try {
    const expense = await Depense.findOne({
      where: { id: expenseId, deplacementId: tripId },
    });
    if (!expense) return res.status(404).json({ error: "Expense not found." });

    if (expense.cheminJustificatif) {
      const filePath = path.join(__dirname, "..", expense.cheminJustificatif.replace(/^\//, ""));
      fs.unlink(filePath, (err) => {
        if (err && err.code !== "ENOENT") console.error("Failed to delete file:", err);
      });
    }

    const updateData = {
      cheminJustificatif: null
    };

    // Only set modifiedBy if someone other than the owner is removing the file
    if (actingUserId !== effectiveUserId) {
      updateData.modifiedBy = actingUserId;
    }

    await expense.update(updateData);

    return res.json({ message: "Justificatif removed." });
  } catch (err) {
    console.error("Error in removeExpenseJustificatif:", err);
    return res.status(500).json({ error: "Server error." });
  }
};