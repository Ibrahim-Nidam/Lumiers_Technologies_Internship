const { VehiculeRateRule, User } = require("../models");

// GET all rules for a specific user
exports.getAllRatesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const includeInactive = req.query.includeInactive === "true";

    const whereClause = includeInactive
      ? { userId }                     // all rules
      : { userId, active: true };      // only active

    const rules = await VehiculeRateRule.findAll({ where: whereClause });

    res.json(rules);
  } catch (error) {
    console.error("GET /vehicule-rates/user/:id →", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// GET a specific rate rule by ID
exports.getRateById = async (req, res) => {
  try {
    const rule = await VehiculeRateRule.findByPk(req.params.id);
    if (!rule) return res.status(404).json({ message: "Règle introuvable." });
    res.json(rule);
  } catch (error) {
    console.error("GET /vehicule-rates/:id →", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// CREATE a new rule
exports.createRate = async (req, res) => {
  try {
    const {
      userId,
      name,
      conditionType,
      rateBeforeThreshold,
      rateAfterThreshold,
      thresholdKm,
      active
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

    const rule = await VehiculeRateRule.create({
      userId,
      name,
      conditionType,
      rateBeforeThreshold,
      rateAfterThreshold,
      thresholdKm,
      active,
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error("POST /vehicule-rates →", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// UPDATE an existing rule
exports.updateRate = async (req, res) => {
  try {
    const id = req.params.id;
    const rule = await VehiculeRateRule.findByPk(id);

    if (!rule) return res.status(404).json({ message: "Règle non trouvée." });

    await rule.update({ ...req.body, dateModification: new Date() });

    res.json(rule);
  } catch (error) {
    console.error("PATCH /vehicule-rates/:id →", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// DELETE a rule
exports.deleteRate = async (req, res) => {
  try {
    const id = req.params.id;
    const rule = await VehiculeRateRule.findByPk(id);

    if (!rule) return res.status(404).json({ message: "Règle non trouvée." });

    await rule.destroy();
    res.json({ message: "Règle supprimée avec succès." });
  } catch (error) {
    console.error("DELETE /vehicule-rates/:id →", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
