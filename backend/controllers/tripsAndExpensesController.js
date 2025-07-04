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
    // Validate input data structure
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
      }).filter(date => !isNaN(date.getTime())); // Filter out invalid dates
      
      if (importedDates.length === 0) {
        throw new Error('Aucune date valide trouvée dans les données importées.');
      }

      const minDate = new Date(Math.min(...importedDates));
      const maxDate = new Date(Math.max(...importedDates));
      
      // Extend range to cover full months
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
          // Handle date conversion properly - trip.date might be a Date object or string
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
          // Ensure consistent date format
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
        // Remove existing trips that are not in the imported data
        for (const [dateKey, existingTrip] of existingTripsByDate) {
          if (!importedTripsByDate.has(dateKey)) {
            // Delete expenses first (due to foreign key constraint)
            await Depense.destroy({
              where: { deplacementId: existingTrip.id },
              transaction: t,
            });
            
            // Delete the trip
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
          // Ensure consistent date format
          const dateKey = new Date(tripData.date).toISOString().split('T')[0];
          
          const existingTripByDate = existingTripsByDate.get(dateKey);
          const existingTripById = id ? existingTripsById.get(id) : null;

        let tripToUpdate = null;
        let shouldCreateNew = false;

        // Determine conflict resolution strategy
        if (existingTripByDate && existingTripById) {
          // Same date and same ID - update existing
          if (existingTripByDate.id === existingTripById.id) {
            tripToUpdate = existingTripByDate;
          } else {
            // Different trips with same date and ID exists - conflict
            if (overrideExisting) {
              // Remove the one with same date, keep the one with same ID
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
          // Same date, different or no ID
          if (overrideExisting) {
            tripToUpdate = existingTripByDate;
          } else {
            // Keep existing, skip import
            continue;
          }
        } else if (existingTripById) {
          // Same ID, different date
          if (overrideExisting) {
            tripToUpdate = existingTripById;
          } else {
            // Keep existing, skip import
            continue;
          }
        } else {
          // No conflict - create new
          shouldCreateNew = true;
        }

        if (tripToUpdate) {
          // Update existing trip
          await tripToUpdate.update({
            ...tripFields,
            modifiedBy: userId,
            dateModification: new Date(),
          }, { transaction: t });

          // Delete existing expenses
          await Depense.destroy({
            where: { deplacementId: tripToUpdate.id },
            transaction: t,
          });

          // Insert new expenses
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
          // Create new trip (exclude id to let auto-increment handle it)
          const { id: _, ...tripFieldsWithoutId } = tripFields;
          const newTrip = await Deplacement.create({
            ...tripFieldsWithoutId,
            userId,
            createdBy: userId,
            modifiedBy: userId,
          }, { transaction: t });

          // Insert expenses for the new trip
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