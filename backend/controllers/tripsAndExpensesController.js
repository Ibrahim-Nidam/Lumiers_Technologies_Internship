const { Op } = require('sequelize');
const { Deplacement, Depense, sequelize } = require('../models');

exports.exportTripsAndExpenses = async (req, res) => {
  try {
    const userId = req.user.userId; // From authMiddleware

    // Calculate date range: first day of last month to last day of current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    const lastMonth = currentMonth - 1 < 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth - 1 < 0 ? currentYear - 1 : currentYear;
    const firstDayLastMonth = new Date(lastMonthYear, lastMonth, 1);
    const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

    // Query trips within the date range for the user
    const trips = await Deplacement.findAll({
      where: {
        userId,
        date: {
          [Op.gte]: firstDayLastMonth,
          [Op.lte]: lastDayCurrentMonth,
        },
      },
      include: [
        {
          model: Depense,
          as: 'depenses',
          attributes: ['id', 'typeDepenseId', 'montant', 'cheminJustificatif'],
        },
      ],
      attributes: ['id', 'typeDeDeplacementId', 'date', 'chantierId', 'distanceKm'],
    });

    // Format the data
    const formattedTrips = trips.map(trip => ({
      id: trip.id,
      typeDeDeplacementId: trip.typeDeDeplacementId,
      date: trip.date,
      chantierId: trip.chantierId,
      distanceKm: trip.distanceKm,
      expenses: trip.depenses.map(expense => ({
        id: expense.id,
        typeDepenseId: expense.typeDepenseId,
        montant: expense.montant,
        cheminJustificatif: expense.cheminJustificatif,
      })),
    }));

    res.json({ trips: formattedTrips });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'exportation des données.' });
  }
};

exports.importTripsAndExpenses = async (req, res) => {
  const { data, overrideExisting } = req.body;
  const userId = req.user.userId;

  if (!data || !data.trips || !Array.isArray(data.trips)) {
    return res.status(400).json({ message: 'Données invalides.' });
  }

  try {
    await sequelize.transaction(async (t) => {
      for (const tripData of data.trips) {
        const { id, expenses, ...tripFields } = tripData;

        const existingTrip = await Deplacement.findOne({
          where: { id, userId },
          transaction: t,
        });

        if (existingTrip) {
          if (overrideExisting) {
            // Update trip
            await existingTrip.update(tripFields, { transaction: t });

            // Delete existing expenses
            await Depense.destroy({
              where: { deplacementId: existingTrip.id },
              transaction: t,
            });

            // Insert new expenses
            for (const expenseData of expenses) {
              const { id: expenseId, ...expenseFields } = expenseData;
              await Depense.create({
                ...expenseFields,
                deplacementId: existingTrip.id,
              }, { transaction: t });
            }
          }
          // Else, skip
        } else {
          // Insert new trip
          const newTrip = await Deplacement.create({
            ...tripFields,
            userId,
          }, { transaction: t });

          // Insert expenses for the new trip
          for (const expenseData of expenses) {
            const { id: expenseId, ...expenseFields } = expenseData;
            await Depense.create({
              ...expenseFields,
              deplacementId: newTrip.id,
            }, { transaction: t });
          }
        }
      }
    });

    res.json({ message: 'Données importées avec succès.' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ message: 'Erreur lors de l\'importation des données.' });
  }
};