const { Op } = require('sequelize');
const { Deplacement, Depense, sequelize } = require('../models');

exports.exportTripsAndExpenses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const lastMonth = currentMonth - 1 < 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth - 1 < 0 ? currentYear - 1 : currentYear;
    const firstDayLastMonth = new Date(lastMonthYear, lastMonth, 1);
    const lastDayCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

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
    if (!data.trips.every(trip => trip.date)) {
      return res.status(400).json({ message: 'Toutes les données de déplacement doivent avoir une date.' });
    }

    await sequelize.transaction(async (t) => {
      // Step 1: Detect date range from imported data
      const importedDates = data.trips.map(trip => {
        try {
          return new Date(trip.date);
        } catch (error) {
          throw new Error(`Date invalide dans les données importées: ${trip.date}`);
        }
      }).filter(date => !isNaN(date.getTime()));
      
      if (importedDates.length === 0) {
        throw new Error('Aucune date valide trouvée dans les données importées.');
      }

      const minDate = new Date(Math.min(...importedDates));
      const maxDate = new Date(Math.max(...importedDates));
      
      const startOfRange = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
      const endOfRange = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);


      // Step 2: Get existing trips in the date range
      const existingTrips = await Deplacement.findAll({
        where: {
          userId,
          date: {
            [Op.gte]: startOfRange,
            [Op.lte]: endOfRange,
          },
        },
        include: [
          {
            model: Depense,
            as: 'depenses',
            attributes: ['id', 'typeDepenseId', 'montant', 'cheminJustificatif'],
          },
        ],
        transaction: t,
      });

      // Step 3: Create maps for efficient lookup
      const existingTripsByDate = new Map();
      const existingTripsById = new Map();
      
      existingTrips.forEach(trip => {
        try {
          const dateKey = trip.date instanceof Date 
            ? trip.date.toISOString().split('T')[0]
            : new Date(trip.date).toISOString().split('T')[0];
          existingTripsByDate.set(dateKey, trip);
          existingTripsById.set(trip.id, trip);
        } catch (error) {
          console.error(`Error processing existing trip date for trip ID ${trip.id}:`, error);
          throw new Error(`Erreur lors du traitement des données existantes pour le déplacement ID ${trip.id}`);
        }
      });

      // Step 4: Create map of imported trips
      const importedTripsByDate = new Map();
      const importedTripsById = new Map();
      
      data.trips.forEach(trip => {
        try {
          const dateKey = new Date(trip.date).toISOString().split('T')[0];
          importedTripsByDate.set(dateKey, trip);
          if (trip.id) {
            importedTripsById.set(trip.id, trip);
          }
        } catch (error) {
          console.error(`Error processing imported trip date:`, error);
          throw new Error(`Date invalide dans les données importées: ${trip.date}`);
        }
      });

      // Step 5: Handle existing trips that are not in the import
      if (overrideExisting) {
        for (const [dateKey, existingTrip] of existingTripsByDate) {
          if (!importedTripsByDate.has(dateKey)) {
            await Depense.destroy({
              where: { deplacementId: existingTrip.id },
              transaction: t,
            });
            
            await Deplacement.destroy({
              where: { id: existingTrip.id },
              transaction: t,
            });
            
          }
        }
      }

      // Step 6: Process imported trips
      for (const tripData of data.trips) {
        try {
          const { id, expenses = [], ...tripFields } = tripData;
          const dateKey = new Date(tripData.date).toISOString().split('T')[0];
          
          const existingTripByDate = existingTripsByDate.get(dateKey);
          const existingTripById = id ? existingTripsById.get(id) : null;

        let tripToUpdate = null;
        let shouldCreateNew = false;

        // Determine conflict resolution strategy
        if (existingTripByDate && existingTripById) {
          if (existingTripByDate.id === existingTripById.id) {
            tripToUpdate = existingTripByDate;
          } else {
            if (overrideExisting) {
              await Depense.destroy({
                where: { deplacementId: existingTripByDate.id },
                transaction: t,
              });
              await Deplacement.destroy({
                where: { id: existingTripByDate.id },
                transaction: t,
              });
              tripToUpdate = existingTripById;
            } else {
              continue;
            }
          }
        } else if (existingTripByDate) {
          if (overrideExisting) {
            tripToUpdate = existingTripByDate;
          } else {
            continue;
          }
        } else if (existingTripById) {
          if (overrideExisting) {
            tripToUpdate = existingTripById;
          } else {
            continue;
          }
        } else {
          shouldCreateNew = true;
        }

        if (tripToUpdate) {
          await tripToUpdate.update({
            ...tripFields,
            modifiedBy: userId,
            dateModification: new Date(),
          }, { transaction: t });

          await Depense.destroy({
            where: { deplacementId: tripToUpdate.id },
            transaction: t,
          });

          for (const expenseData of expenses) {
            const { id: expenseId, ...expenseFields } = expenseData;
            await Depense.create({
              ...expenseFields,
              deplacementId: tripToUpdate.id,
              createdBy: userId,
              modifiedBy: userId,
            }, { transaction: t });
          }

        } else if (shouldCreateNew) {
          const { id: _, ...tripFieldsWithoutId } = tripFields;
          const newTrip = await Deplacement.create({
            ...tripFieldsWithoutId,
            userId,
            createdBy: userId,
            modifiedBy: userId,
          }, { transaction: t });

          for (const expenseData of expenses) {
            const { id: expenseId, ...expenseFields } = expenseData;
            await Depense.create({
              ...expenseFields,
              deplacementId: newTrip.id,
              createdBy: userId,
              modifiedBy: userId,
            }, { transaction: t });
          }

        }
        } catch (error) {
          console.error(`Error processing trip for date ${tripData.date}:`, error);
          throw new Error(`Erreur lors du traitement du déplacement pour la date ${tripData.date}: ${error.message}`);
        }
      }
    });

    res.json({ message: 'Données importées avec succès.' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Erreur lors de l\'importation des données.',
      error: error.message 
    });
  }
};