const { DistanceDetail, VehiculeRateRule, Sequelize } = require('../models');

// Create a new segment
exports.createSegment = async (req, res, next) => {
  try {
    const { dateSegment, lieuDepart, lieuArrivee, distanceKm, vehiculeRateRuleId } = req.body;
    const segment = await DistanceDetail.create({
      userId: req.user.userId, // Changed from req.user.id to req.user.userId
      dateSegment,
      lieuDepart,
      lieuArrivee,
      distanceKm,
      vehiculeRateRuleId
    });
    return res.status(201).json(segment);
  } catch (err) {
    next(err);
  }
};

// Get all segments for the current user on a given date
exports.getSegmentsByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Missing `date` query parameter' });

    const segments = await DistanceDetail.findAll({
      where: {
        userId: req.user.userId, // Changed from req.user.id to req.user.userId
        dateSegment: date
      },
      include: [{ model: VehiculeRateRule, as: 'vehiculeRateRule' }]
    });
    return res.json(segments);
  } catch (err) {
    next(err);
  }
};

// Update one segment (only owner can)
exports.updateSegment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const segment = await DistanceDetail.findOne({ 
      where: { id, userId: req.user.userId } // Changed from req.user.id to req.user.userId
    });
    if (!segment) return res.status(404).json({ message: 'Segment not found' });

    const { dateSegment, lieuDepart, lieuArrivee, distanceKm, vehiculeRateRuleId } = req.body;
    await segment.update({ dateSegment, lieuDepart, lieuArrivee, distanceKm, vehiculeRateRuleId });
    return res.json(segment);
  } catch (err) {
    next(err);
  }
};

// Delete one segment
exports.deleteSegment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await DistanceDetail.destroy({
      where: { id, userId: req.user.userId } // Changed from req.user.id to req.user.userId
    });
    if (!deleted) return res.status(404).json({ message: 'Segment not found or already deleted' });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};


exports.getDatesWithSegments = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    console.log('Getting distinct dateSegment for user:', userId);

    const rows = await DistanceDetail.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('date_segment')), 'dateSegment']],
      where: { userId },
      order: [[Sequelize.col('date_segment'), 'ASC']],
      raw: true
    });

    const dates = rows.map(r => r.dateSegment);
    return res.json(dates);
  } catch (err) {
    console.error('Erreur dans getDatesWithSegments:', err);
    return res.status(500).json({ message: 'Erreur interne', error: err.message });
  }
};
