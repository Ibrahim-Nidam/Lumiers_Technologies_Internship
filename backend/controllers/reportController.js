const { Op } = require('sequelize');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const {
  User, Deplacement, Depense, Role,
  TauxMissionRole, VehiculeRateRule, TypeDeDeplacement, Chantier
} = require('../models');
const ExcelJS   = require('exceljs');
const pdfMake   = require('pdfmake/build/pdfmake');
const pdfFonts  = require('pdfmake/build/vfs_fonts');
pdfMake.vfs     = pdfFonts;
const fs        = require('fs-extra');
const path      = require('path');
const logo      = require('../utils/base64Logo');

// Helper: format "Month Year" in French
const getMonthLabel = (year, month) =>
  new Date(year, month).toLocaleDateString('fr-FR', {
    month: 'long', year: 'numeric'
  });

// Fetch all dashboard data for one user/month
async function getDashboardData(userId, year, month) {
  const start = new Date(year, month, 1);
  const end   = new Date(year, month + 1, 0);

  const userInfo = await User.findByPk(userId, {
    include: [{ model: Role, as: 'role' }]
  });

  if (!userInfo) {
    throw new Error(`User with id ${userId} not found`);
  }
  if (!userInfo.roleId) {
    throw new Error(`User with id ${userId} does not have a role assigned`);
  }

  const trips = await Deplacement.findAll({
    where: { userId, date: { [Op.between]: [start, end] } },
    include: [
      { model: Depense, as: 'depenses' },
      { model: VehiculeRateRule, as: 'vehiculeRateRule' },
      { model: Chantier, as: 'chantier' }
    ]
  });

  const roleMissionRates = await TauxMissionRole.findAll({ 
    where: { roleId: userInfo.roleId } 
  });
  
  const userVehiculeRateRules = await VehiculeRateRule.findAll({ 
    where: { userId: userInfo.id, active: true } 
  });
  
  const travelTypes = await TypeDeDeplacement.findAll();

  return { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes };
}

function getTotalExpenses(depenses) {
  return depenses.reduce((sum, expense) => sum + (parseFloat(expense.montant) || 0), 0);
}

// NEW: Helper function to calculate kilometric cost based on vehicule rate rule
function calculateTotalKilometricCost(trips, userVehiculeRateRules) {
  // Group trips by their selected vehicle rate rule
  const groupedByRate = {};
  
  for (const trip of trips) {
    let ruleId = trip.vehiculeRateRuleId;
    
    // If trip doesn't have a specific rule, use the first available user rule
    if (!ruleId && userVehiculeRateRules && userVehiculeRateRules.length > 0) {
      ruleId = userVehiculeRateRules[0].id;
    }
    
    if (!ruleId) continue; // Skip trips without applicable rules
    
    if (!groupedByRate[ruleId]) groupedByRate[ruleId] = [];
    groupedByRate[ruleId].push(trip);
  }

  let totalDistanceCost = 0;
  
  for (const ruleId in groupedByRate) {
    const tripsForRule = groupedByRate[ruleId];
    const distanceSum = tripsForRule.reduce((sum, trip) => sum + (parseFloat(trip.distanceKm) || 0), 0);
    
    // Find the applicable rule
    let rule = null;
    // First check if any trip has the rule loaded via include
    for (const trip of tripsForRule) {
      if (trip.vehiculeRateRuleId === parseInt(ruleId) && trip.vehiculeRateRule) {
        rule = trip.vehiculeRateRule;
        break;
      }
    }
    // If not found, check user's rules
    if (!rule && userVehiculeRateRules) {
      rule = userVehiculeRateRules.find(r => r.id === parseInt(ruleId));
    }
    
    if (!rule || distanceSum === 0) continue;
    
    // Calculate cost based on rule type using total distance for this rule
    if (rule.conditionType === "ALL") {
      totalDistanceCost += distanceSum * rule.rateBeforeThreshold;
    } else if (rule.conditionType === "THRESHOLD") {
      const threshold = rule.thresholdKm || 0;
      const before = rule.rateBeforeThreshold;
      const after = rule.rateAfterThreshold || before;
      
      if (distanceSum <= threshold) {
        totalDistanceCost += distanceSum * before;
      } else {
        totalDistanceCost += (threshold * before) + ((distanceSum - threshold) * after);
      }
    }
  }
  
  return totalDistanceCost;
}

exports.generateMonthlyRecap = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || month === undefined) {
      return res.status(400).json({ error: "Missing year or month parameters" });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, Number(month) + 1, 0);

    // Get all users with their roles
    const users = await User.findAll({
      where: { estActif: true },
      include: [{ model: Role, as: 'role' }],
      order: [['nomComplete', 'ASC']]
    });

    // Get all travel types
    const travelTypes = await TypeDeDeplacement.findAll();

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Récapitulatif Mensuel');

    // Set up column headers
    const baseColumns = [
      { header: 'Nom Complet', key: 'fullName', width: 25 },
      { header: 'Total Jours de Déplacement', key: 'totalTripDays', width: 20 }
    ];

    const typeColumns = travelTypes.map(type => ({
      header: `${type.nom} (Jours)`,
      key: `days_${type.id}`,
      width: 18
    }));

    const rateColumns = travelTypes.map(type => ({
      header: `Taux ${type.nom} (DH)`,
      key: `rate_${type.id}`,
      width: 18
    }));

    const endColumns = [
      { header: 'Distance Parcourue (KM)', key: 'totalDistance', width: 22 },
      { header: 'Total Général (DH)', key: 'grandTotal', width: 18 }
    ];

    worksheet.columns = [...baseColumns, ...typeColumns, ...rateColumns, ...endColumns];

    // Style the header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

    // Process each user
    for (const user of users) {
      const [trips, roleMissionRates, userVehiculeRateRules] = await Promise.all([
        Deplacement.findAll({
          where: {
            userId: user.id,
            date: { [Op.between]: [startDate, endDate] }
          },
          include: [
            { model: Depense, as: 'depenses' },
            { model: TypeDeDeplacement, as: 'typeDeDeplacement' },
            { model: VehiculeRateRule, as: 'vehiculeRateRule' },
            { model: Chantier, as: 'chantier' }
          ]
        }),
        TauxMissionRole.findAll({ where: { roleId: user.roleId } }),
        VehiculeRateRule.findAll({ where: { userId: user.id, active: true } })
      ]);

      // Calculate total kilometric cost
      const totalKilometricCost = calculateTotalKilometricCost(trips, userVehiculeRateRules);

      // Initialize user data
      const userData = {
        fullName: user.nomComplete,
        totalTripDays: trips.length,
        totalDistance: 0,
        grandTotal: 0
      };

      const typeDays = {};
      const typeRates = {};
      travelTypes.forEach(type => {
        typeDays[type.id] = 0;
        typeRates[type.id] = 0;
      });

      let totalOtherCosts = 0;

      // Process trips for other costs and data
      for (const trip of trips) {
        const typeId = trip.typeDeDeplacementId;

        if (typeDays[typeId] !== undefined) {
          typeDays[typeId]++;
        }

        if (typeRates[typeId] === 0) {
          const roleRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === typeId);
          typeRates[typeId] = roleRate ? parseFloat(roleRate.tarifParJour) || 0 : 0;
        }

        const expensesTotal = getTotalExpenses(trip.depenses);
        const travelTypeAmount = typeRates[typeId];
        totalOtherCosts += expensesTotal + travelTypeAmount;

        userData.totalDistance += parseFloat(trip.distanceKm) || 0;
      }

      // Set grand total
      userData.grandTotal = totalOtherCosts + totalKilometricCost;

      // Prepare row data
      const rowData = { ...userData };
      travelTypes.forEach(type => {
        rowData[`days_${type.id}`] = typeDays[type.id];
        rowData[`rate_${type.id}`] = typeDays[type.id] > 0 ? typeRates[type.id].toFixed(2) : '0.00';
      });

      rowData.totalDistance = userData.totalDistance.toFixed(2);
      rowData.grandTotal = userData.grandTotal.toFixed(2);

      worksheet.addRow(rowData);
    }

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
          };
        }
      }
    });

    worksheet.eachRow(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Add summary row
    const summaryRowNumber = worksheet.rowCount + 2;
    const summaryRow = worksheet.getRow(summaryRowNumber);
    summaryRow.getCell(1).value = 'TOTAL GÉNÉRAL';
    summaryRow.getCell(1).font = { bold: true };

    let totalAllTrips = 0;
    let totalAllDistance = 0;
    let totalAllAmount = 0;

    for (let i = 2; i <= worksheet.rowCount - 1; i++) {
      const row = worksheet.getRow(i);
      totalAllTrips += parseInt(row.getCell(2).value) || 0;
      totalAllDistance += parseFloat(row.getCell(worksheet.columns.length - 1).value) || 0;
      totalAllAmount += parseFloat(row.getCell(worksheet.columns.length).value) || 0;
    }

    summaryRow.getCell(2).value = totalAllTrips;
    summaryRow.getCell(worksheet.columns.length - 1).value = totalAllDistance.toFixed(2);
    summaryRow.getCell(worksheet.columns.length).value = totalAllAmount.toFixed(2);

    summaryRow.font = { bold: true };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE599' }
    };

    // Set response headers
    const monthLabel = getMonthLabel(year, month);
    const filename = `Recapitulatif_${monthLabel.replace(' ', '_')}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating monthly recap:', error);
    res.status(500).json({ error: 'Failed to generate monthly recap' });
  }
};

exports.getUserAggregates = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || month === undefined) {
      return res.status(400).json({ error: "Missing year or month" });
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, Number(month) + 1, 0);

    const users = await User.findAll({
      include: [{ model: Role, as: 'role' }]
    });

    const summaries = await Promise.all(
      users.map(async (user) => {
        const [deplacements, roleMissionRates, userVehiculeRateRules] = await Promise.all([
          Deplacement.findAll({
            where: {
              userId: user.id,
              date: { [Op.between]: [startDate, endDate] }
            },
            include: [
              { model: Depense, as: "depenses" },
              { model: VehiculeRateRule, as: 'vehiculeRateRule' },
              { model: Chantier, as: 'chantier' }
            ]
          }),
          TauxMissionRole.findAll({ where: { roleId: user.roleId } }),
          VehiculeRateRule.findAll({ where: { userId: user.id, active: true } })
        ]);

        let totalDistance = 0;
        let totalExpenses = 0;
        let justified = 0;
        let unjustified = 0;

        // Calculate expenses and mission rates for each trip
        for (const trip of deplacements) {
          totalDistance += parseFloat(trip.distanceKm) || 0;

          const expensesTotal = getTotalExpenses(trip.depenses);

          const travelTypeRate = roleMissionRates.find(
            rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId
          );
          const travelTypeAmount = travelTypeRate ? parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

          totalExpenses += expensesTotal + travelTypeAmount;

          // Justification count
          for (const expense of trip.depenses) {
            const justificatif = expense.cheminJustificatif;
            if (justificatif && justificatif.trim() !== "") {
              justified++;
            } else {
              unjustified++;
            }
          }
        }

        // Calculate total kilometric cost for all trips at once
        const totalKilometricCost = calculateTotalKilometricCost(deplacements, userVehiculeRateRules);
        totalExpenses += totalKilometricCost;

        return {
          userId: user.id,
          totalDistance,
          totalTripCost: totalExpenses,
          justified,
          unjustified
        };
      })
    );

    res.json(summaries);
  } catch (error) {
    console.error("Error in getUserAggregates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Helper function to calculate distance costs with threshold logic for export (matches frontend)
 */
const calculateDistanceCostsForExport = (trips, userVehiculeRateRules) => {
  // Group trips by their vehicle rate rule
  const groupedByRate = {};
  const distanceCosts = new Map();

  trips.forEach(trip => {
    const ruleId = trip.vehiculeRateRuleId;
    if (ruleId) {
      if (!groupedByRate[ruleId]) groupedByRate[ruleId] = [];
      groupedByRate[ruleId].push(trip);
    }
  });

  // Calculate costs for each rate rule
  for (const ruleId in groupedByRate) {
    const tripsForRule = groupedByRate[ruleId];
    const rule = userVehiculeRateRules?.find(r => r.id === parseInt(ruleId));
    
    if (!rule) continue;

    const totalDistance = tripsForRule.reduce((sum, trip) => sum + (parseFloat(trip.distanceKm) || 0), 0);
    let totalCost = 0;

    if (totalDistance > 0) {
      if (rule.conditionType === "ALL") {
        totalCost = totalDistance * rule.rateBeforeThreshold;
      } else if (rule.conditionType === "THRESHOLD") {
        const threshold = rule.thresholdKm || 0;
        const before = rule.rateBeforeThreshold;
        const after = rule.rateAfterThreshold || before;

        if (totalDistance <= threshold) {
          totalCost = totalDistance * before;
        } else {
          totalCost = (threshold * before) + ((totalDistance - threshold) * after);
        }
      }

      // Use rule name or a default label
      const ruleLabel = rule.name || rule.libelle || `Règle ${ruleId}`;
      distanceCosts.set(ruleLabel, {
        distance: totalDistance,
        total: totalCost,
        rate: rule.rateBeforeThreshold, // Show the base rate for display
        rateAfter: rule.rateAfterThreshold,
        threshold: rule.thresholdKm,
        conditionType: rule.conditionType
      });
    }
  }

  return distanceCosts;
};

/**
 * Generate Excel file with updated vehicule rate rule system (matches frontend)
 */
exports.generateExcelReport = async (userId, year, month) => {
  try {
    const { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes } =
      await getDashboardData(userId, year, month);
    const label = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // Calculate totals using the updated logic that matches frontend
    const calculateTotals = () => {
      const dailyAllowances = new Map();
      let totalMisc = 0;
      let miscCount = 0;

      trips.forEach(trip => {
        // Sum miscellaneous expenses and count them
        if (Array.isArray(trip.depenses)) {
          miscCount += trip.depenses.length;
          trip.depenses.forEach(expense => {
            totalMisc += parseFloat(expense.montant) || 0;
          });
        }

        // Group Daily Allowances by their rate
        const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
        if (missionRate) {
          const rate = parseFloat(missionRate.tarifParJour) || 0;
          const travelTypeName = travelTypes.find(type => type.id === trip.typeDeDeplacementId)?.nom || 'Type de déplacement inconnu';

          if (!dailyAllowances.has(rate)) {
            dailyAllowances.set(rate, { count: 0, total: 0, name: travelTypeName });
          }
          const current = dailyAllowances.get(rate);
          current.count += 1;
          current.total += rate;
        }
      });

      // Calculate distance costs using the updated logic
      const mileageCosts = calculateDistanceCostsForExport(trips, userVehiculeRateRules);

      // Calculate Grand Total
      let grandTotal = totalMisc;
      mileageCosts.forEach(value => grandTotal += value.total);
      dailyAllowances.forEach(value => grandTotal += value.total);

      return {
        totalMisc,
        miscCount,
        mileageCosts,
        dailyAllowances,
        grandTotal
      };
    };

    const totals = calculateTotals();

    // Build Excel workbook
    const wb = new ExcelJS.Workbook();
    
    // --- START: Detailed Trips Sheet ---
    const wsTrips = wb.addWorksheet('Détail des Trajets');
    wsTrips.addRow([`Détail des Trajets pour ${fullName} - ${label}`]).font = { size: 16, bold: true };
    wsTrips.mergeCells('A1:D1');
    wsTrips.getCell('A1').alignment = { horizontal: 'center' };
    wsTrips.addRow([]); // Spacer

    const tripsHeader = wsTrips.addRow(['Date', 'Chantier', 'Distance (Km)', 'Type de Déplacement']);
    tripsHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    trips.forEach(trip => {
      const travelType = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'N/A';
      wsTrips.addRow([
        new Date(trip.date).toLocaleDateString('fr-FR'),
        trip.chantier?.designation || 'N/A',
        parseFloat(trip.distanceKm) || 0,
        travelType,
      ]);
    });

    // Auto-width columns for trips sheet
    wsTrips.columns.forEach(column => {
      let maxTextLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const textLength = (cell.value || '').toString().length;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
        }
      });
      column.width = maxTextLength < 10 ? 12 : maxTextLength + 4;
    });
    // --- END: Detailed Trips Sheet ---

    // --- START: Miscellaneous Expenses Sheet ---
    const wsExpenses = wb.addWorksheet('Dépenses Diverses');
    wsExpenses.addRow([`Dépenses Diverses pour ${fullName} - ${label}`]).font = { size: 16, bold: true };
    wsExpenses.mergeCells('A1:C1');
    wsExpenses.getCell('A1').alignment = { horizontal: 'center' };
    wsExpenses.addRow([]); // Spacer

    const expensesHeader = wsExpenses.addRow(['Date du Trajet', 'Montant (MAD)', 'Justificatif']);
    expensesHeader.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    
    trips.forEach(trip => {
      if (trip.depenses && trip.depenses.length > 0) {
        trip.depenses.forEach(expense => {
          const amount = parseFloat(expense.montant) || 0;
          const expenseRow = wsExpenses.addRow([
            new Date(trip.date).toLocaleDateString('fr-FR'),
            amount,
            expense.cheminJustificatif ? 'Oui' : 'Non'
          ]);
          // Format the currency cell
          expenseRow.getCell(2).numFmt = '#,##0.00 "MAD"';
        });
      }
    });

    // Add total for misc expenses
    const totalExpensesRow = wsExpenses.addRow(['Total', totals.totalMisc, '']);
    totalExpensesRow.getCell(1).font = { bold: true };
    const totalExpensesCell = totalExpensesRow.getCell(2);
    totalExpensesCell.font = { bold: true };
    totalExpensesCell.numFmt = '#,##0.00 "MAD"';

    // Auto-width columns for expenses sheet
    wsExpenses.columns.forEach(column => {
      let maxTextLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const textLength = (cell.value || '').toString().length;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
        }
      });
      column.width = maxTextLength < 10 ? 12 : maxTextLength + 4;
    });
    // --- END: Miscellaneous Expenses Sheet ---

    // --- START: Recap Sheet ---
    const wsRecap = wb.addWorksheet('Récapitulatif');

    // Header image
    const imgId = wb.addImage({ base64: logo, extension: 'png' });
    wsRecap.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
    wsRecap.mergeCells('D1:E2');
    wsRecap.getCell('D1').value = `Nom et Prénom : ${fullName}`;
    wsRecap.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
    wsRecap.getCell('D1').font = { size: 12 };

    // Title
    wsRecap.mergeCells('A4:E4');
    wsRecap.getCell('A4').value = `Note de frais – ${label}`;
    wsRecap.getCell('A4').font = { size: 16, bold: true };
    wsRecap.getCell('A4').alignment = { horizontal: 'center' };
    wsRecap.addRow([]); // Spacer

    // Table header
    const headerRowRecap = wsRecap.addRow(['Désignation', 'Chantier', 'Quantité', 'Taux / J', 'Montant']);
    headerRowRecap.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Misc expenses row
    const miscRow = wsRecap.addRow(['Feuille de depens', '', totals.miscCount, '-', totals.totalMisc]);
    miscRow.getCell(5).numFmt = '#,##0.00 "MAD"';
    miscRow.alignment = { horizontal: 'right' };

    // Daily allowances
    totals.dailyAllowances.forEach(({ count, total, name }, rate) => {
      const allowanceRow = wsRecap.addRow([`Frais journaliers (${name})`, '', count, rate, total]);
      allowanceRow.getCell(4).numFmt = '#,##0.00 "MAD"';
      allowanceRow.getCell(5).numFmt = '#,##0.00 "MAD"';
      allowanceRow.alignment = { horizontal: 'right' };
    });

    // Mileage costs with updated logic
    totals.mileageCosts.forEach(({ distance, total, rate, conditionType, threshold, rateAfter }, libelle) => {
      let rateDisplay;
      if (conditionType === "THRESHOLD" && threshold && rateAfter !== rate) {
        rateDisplay = `${rate.toFixed(2)}/${rateAfter.toFixed(2)} (seuil: ${threshold}km)`;
      } else {
        rateDisplay = rate.toFixed(2);
      }
      const mileageRow = wsRecap.addRow([`Frais kilométrique (${libelle})`, '', `${distance.toFixed(2)} Km`, rateDisplay, total]);
      mileageRow.getCell(5).numFmt = '#,##0.00 "MAD"';
      mileageRow.alignment = { horizontal: 'right' };
    });

    // Grand total
    const totalRowRecap = wsRecap.addRow(['Total Dépense', '', '', '', totals.grandTotal]);
    wsRecap.mergeCells(`A${totalRowRecap.number}:D${totalRowRecap.number}`);
    const totalLabelCell = wsRecap.getCell(`A${totalRowRecap.number}`);
    totalLabelCell.font = { bold: true, size: 12 };
    totalLabelCell.alignment = { horizontal: 'right' };

    const grandTotalCell = wsRecap.getCell(`E${totalRowRecap.number}`);
    grandTotalCell.numFmt = '#,##0.00 "MAD"';
    grandTotalCell.font = { bold: true, size: 12 };
    grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; // Light grey
    grandTotalCell.alignment = { horizontal: 'right' };

    // Auto-width columns for recap sheet
    wsRecap.columns.forEach(column => {
      let maxTextLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const textLength = (cell.value || '').toString().length;
        if (textLength > maxTextLength) {
          maxTextLength = textLength;
        }
      });
      column.width = maxTextLength < 10 ? 12 : maxTextLength + 4;
    });
    // --- END: Recap Sheet ---

    // Write to tmp and return path
    const tmpDir = path.join(os.tmpdir(), 'myapp-reports');
    await fs.ensureDir(tmpDir);
    const outPath = path.join(tmpDir, `report-${userId}-${year}-${month+1}-${uuidv4()}.xlsx`);
    await wb.xlsx.writeFile(outPath);
    return outPath;

  } catch (err) {
    console.error("❌ generateExcelReport failed:", err);
    throw err;
  }
};

/**
 * Generate PDF file with updated vehicule rate rule system (matches frontend)
 */
exports.generatePDFReport = async (userId, year, month) => {
  try {
    // 1. Fetch all necessary data for the report
    const { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes } =
      await getDashboardData(userId, year, month);
    const label = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // 2. Calculate totals using the updated logic that matches frontend
    const calculateTotals = () => {
      const dailyAllowances = new Map();
      let totalMiscExpenses = 0;
      let miscExpensesCount = 0;

      trips.forEach(trip => {
        // Sum miscellaneous expenses and count them
        if (trip.depenses && Array.isArray(trip.depenses)) {
          miscExpensesCount += trip.depenses.length;
          trip.depenses.forEach(expense => {
            totalMiscExpenses += parseFloat(expense.montant) || 0;
          });
        }

        // Group Daily Allowances by their rate
        const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
        if (missionRate) {
          const rate = parseFloat(missionRate.tarifParJour) || 0;
          const travelTypeName = travelTypes.find(type => type.id === trip.typeDeDeplacementId)?.nom || 'Type de déplacement inconnu';

          if (!dailyAllowances.has(rate)) {
            dailyAllowances.set(rate, { count: 0, total: 0, name: travelTypeName });
          }
          const current = dailyAllowances.get(rate);
          current.count += 1;
          current.total += rate;
        }
      });

      // Calculate distance costs using the updated logic
      const mileageCosts = calculateDistanceCostsForExport(trips, userVehiculeRateRules);

      // Calculate Grand Total
      let grandTotal = totalMiscExpenses;
      mileageCosts.forEach(value => grandTotal += value.total);
      dailyAllowances.forEach(value => grandTotal += value.total);

      return {
        totalMiscExpenses,
        miscExpensesCount,
        mileageCosts,
        dailyAllowances,
        grandTotal
      };
    };

    const totals = calculateTotals();

    // 3. Build the table body for the PDF document
    const tableBody = [
      [
        { text: 'Désignation', bold: true, fillColor: '#f0f0f0' },
        { text: 'Chantier', bold: true, fillColor: '#f0f0f0' },
        { text: 'Quantité', bold: true, fillColor: '#f0f0f0' },
        { text: 'Taux / J', bold: true, fillColor: '#f0f0f0' },
        { text: 'Montant', bold: true, fillColor: '#f0f0f0' }
      ],
      [
        'Feuille de depens',
        '',
        { text: totals.miscExpensesCount, alignment: 'right' },
        '-',
        { text: totals.totalMiscExpenses.toFixed(2), alignment: 'right' }
      ]
    ];

    // Add a row for each unique daily allowance rate
    totals.dailyAllowances.forEach((data, rate) => {
      tableBody.push([
        `Frais journaliers (${data.name})`,
        '',
        { text: `${data.count}`, alignment: 'right' },
        { text: rate.toFixed(2), alignment: 'right' },
        { text: data.total.toFixed(2), alignment: 'right' }
      ]);
    });

    // Add a row for each unique mileage category with updated logic
    totals.mileageCosts.forEach((data, libelle) => {
      let rateDisplay;
      if (data.conditionType === "THRESHOLD" && data.threshold && data.rateAfter !== data.rate) {
        rateDisplay = `${data.rate.toFixed(2)}/${data.rateAfter.toFixed(2)} (seuil: ${data.threshold}km)`;
      } else {
        rateDisplay = data.rate.toFixed(2);
      }

      tableBody.push([
        `Frais kilométrique (${libelle})`,
        '',
        { text: `${data.distance.toFixed(2)} Km`, alignment: 'right' },
        { text: rateDisplay, alignment: 'right' },
        { text: data.total.toFixed(2), alignment: 'right' }
      ]);
    });

    // Add the final total row
    tableBody.push([
      { text: 'Total Dépense', colSpan: 4, alignment: 'right', bold: true, fillColor: '#f0f0f0' },
      {}, {}, {},
      { text: totals.grandTotal.toFixed(2), bold: true, alignment: 'right', fillColor: '#f0f0f0' }
    ]);

    // 4. Define the complete PDF document structure
    const docDefinition = {
      content: [
        {
          columns: [
            { image: logo, width: 100, height: 50 },
            { text: `Nom et Prénom : ${fullName}`, style: 'userInfo', alignment: 'right' }
          ],
          margin: [0, 0, 0, 20]
        },
        {
          text: `Note de frais - ${label}`,
          style: 'header'
        },
        {
          table: {
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: tableBody
          },
          layout: {
            hLineWidth: function (i, node) {
              return (i === 0 || i === node.table.body.length) ? 2 : 1;
            },
            vLineWidth: function (i, node) {
              return (i === 0 || i === node.table.widths.length) ? 2 : 1;
            },
            hLineColor: function (i, node) {
              return (i === 0 || i === node.table.body.length) ? 'black' : 'gray';
            },
            vLineColor: function (i, node) {
              return (i === 0 || i === node.table.widths.length) ? 'black' : 'gray';
            }
          }
        },
        {
          text: '\n\n\n'
        },
        {
          table: {
            widths: ['50%', '50%'],
            body: [
              [
                { text: 'Signature de l\'intéressé', alignment: 'center', border: [true, true, true, false] },
                { text: 'Signature du responsable', alignment: 'center', border: [true, true, true, false] }
              ],
              [
                { text: '', margin: [0, 40, 0, 0], border: [true, false, true, true] },
                { text: '', margin: [0, 40, 0, 0], border: [true, false, true, true] }
              ]
            ]
          },
          layout: 'noBorders'
        }
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        userInfo: {
          fontSize: 12,
          alignment: 'right'
        }
      },
      defaultStyle: {
        fontSize: 10
      }
    };

    // 5. Generate and save the PDF file to a temporary directory
    const tmpDir = path.join(os.tmpdir(), 'myapp-reports');
    await fs.ensureDir(tmpDir);
    const outPath = path.join(tmpDir, `report-${userId}-${year}-${month + 1}-${uuidv4()}.pdf`);

    const pdfDoc = pdfMake.createPdf(docDefinition);
    await new Promise((resolve, reject) => {
      pdfDoc.getBuffer(buffer => {
        fs.writeFile(outPath, buffer, err => {
          if (err) return reject(err);
          resolve();
        });
      });
    });

    return outPath;

  } catch (err) {
    console.error("❌ generatePDFReport failed:", err);
    throw err;
  }
};
/**
 * Express handler: stream Excel as attachment
 */
exports.exportExcel = async (req, res, next) => {
  try {
    const { userId, year, month } = req.query;
    const filePath = await exports.generateExcelReport(userId, +year, +month);
    res.download(filePath, err => {
      if (err) return next(err);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete file:', unlinkErr);
      });
    });
  } catch (err) {
    console.error("Export Excel failed:", err);
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    } else if (err.message.includes("does not have a role")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * Express handler: stream PDF as attachment
 */
exports.exportPDF = async (req, res, next) => {
  try {
    const { userId, year, month } = req.query;
    const filePath = await exports.generatePDFReport(userId, +year, +month);
    res.download(filePath, err => {
      if (err) return next(err);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) console.error('Failed to delete file:', unlinkErr);
      });
    });
  } catch (err) {
    console.error("Export PDF failed:", err);
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    } else if (err.message.includes("does not have a role")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
};