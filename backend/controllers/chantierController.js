const { Chantier, TypeDeDeplacement } = require("../models");

// GET /chantiers
exports.getAllChantiers = async (req, res) => {
  try {
    const chantiers = await Chantier.findAll({
      include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement", attributes: ["id", "nom"] }],
      order: [["id", "DESC"]],
    });
    res.json(chantiers);
  } catch (error) {
    console.error("Erreur getAllChantiers:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des chantiers" });
  }
};

// GET /chantiers/:id
exports.getChantierById = async (req, res) => {
  try {
    const chantier = await Chantier.findByPk(req.params.id, {
      include: [{ model: TypeDeDeplacement, as: "typeDeDeplacement", attributes: ["id", "nom"] }],
    });
    if (!chantier) return res.status(404).json({ message: "Chantier non trouvé" });
    res.json(chantier);
  } catch (error) {
    console.error("Erreur getChantierById:", error);
    res.status(500).json({ message: "Erreur lors de la récupération du chantier" });
  }
};

// POST /chantiers
exports.createChantier = async (req, res) => {
  try {
    const { typeDeDeplacementId, codeChantier, designation, ville } = req.body;
    const newChantier = await Chantier.create({ typeDeDeplacementId, codeChantier, designation, ville });
    res.status(201).json(newChantier);
  } catch (error) {
    console.error("Erreur createChantier:", error);
    res.status(500).json({ message: "Erreur lors de la création du chantier" });
  }
};

// PATCH /chantiers/:id
exports.updateChantier = async (req, res) => {
  try {
    const chantier = await Chantier.findByPk(req.params.id);
    if (!chantier) return res.status(404).json({ message: "Chantier non trouvé" });

    await chantier.update({ ...req.body, dateModification: new Date() });
    res.json(chantier);
  } catch (error) {
    console.error("Erreur updateChantier:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour du chantier" });
  }
};

// DELETE /chantiers/:id
exports.deleteChantier = async (req, res) => {
  try {
    const chantier = await Chantier.findByPk(req.params.id);
    if (!chantier) return res.status(404).json({ message: "Chantier non trouvé" });

    await chantier.destroy();
    res.json({ message: "Chantier supprimé" });
  } catch (error) {
    console.error("Erreur deleteChantier:", error);
    res.status(500).json({ message: "Erreur lors de la suppression du chantier" });
  }
};
