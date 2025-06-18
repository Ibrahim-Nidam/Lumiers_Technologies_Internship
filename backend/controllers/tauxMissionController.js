const { TauxMissionRole, TypeDeDeplacement } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const data = await TauxMissionRole.findAll({
      include: [{ model: TypeDeDeplacement, as: 'typeDeDeplacement' }]
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const entry = await TauxMissionRole.create(req.body);
    res.status(201).json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TauxMissionRole.findByPk(id);
    if (!entry) return res.status(404).json({ error: "Not found" });

    await entry.update(req.body);
    res.json(entry);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await TauxMissionRole.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Not found" });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
