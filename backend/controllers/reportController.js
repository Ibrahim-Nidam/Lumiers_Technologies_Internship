const { Op } = require('sequelize');
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
  
  const trips = await Deplacement.findAll({
    where: { userId, date: { [Op.between]: [start, end] } },
    include: [
      { model: Depense, as: 'depenses' },
      { model: VehiculeRateRule, as: 'vehiculeRateRule' },
      { model: Chantier, as: 'chantier' }
    ]
  });

  // Get rates based on user's role
  const roleMissionRates = await TauxMissionRole.findAll({ 
    where: { roleId: userInfo.roleId } 
  });
  
  // Get user's vehicule rate rules
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
function calculateKilometricCost(trip, userVehiculeRateRules) {
  const distance = parseFloat(trip.distanceKm) || 0;
  if (distance <= 0) return 0;

  let applicableRule = null;

  // Priority 1: If trip has a specific vehicule rate rule assigned
  if (trip.vehiculeRateRuleId && trip.vehiculeRateRule) {
    applicableRule = trip.vehiculeRateRule;
  } 
  // Priority 2: Find from user's active rules
  else if (userVehiculeRateRules && userVehiculeRateRules.length > 0) {
    // For now, take the first active rule - you can implement priority logic here
    applicableRule = userVehiculeRateRules[0];
  }

  if (!applicableRule) return 0;

  // Calculate cost based on rule type
  if (applicableRule.conditionType === 'ALL') {
    return distance * applicableRule.rateBeforeThreshold;
  } 
  else if (applicableRule.conditionType === 'THRESHOLD') {
    const threshold = applicableRule.thresholdKm || 0;
    const rateBefore = applicableRule.rateBeforeThreshold || 0;
    const rateAfter = applicableRule.rateAfterThreshold || 0;

    if (distance <= threshold) {
      return distance * rateBefore;
    } else {
      return (threshold * rateBefore) + ((distance - threshold) * rateAfter);
    }
  }

  return 0;
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

    // Add columns for each travel type (days)
    const typeColumns = [];
    travelTypes.forEach(type => {
      typeColumns.push({
        header: `${type.nom} (Jours)`,
        key: `days_${type.id}`,
        width: 18
      });
    });

    // Add columns for each travel type (rates)
    const rateColumns = [];
    travelTypes.forEach(type => {
      rateColumns.push({
        header: `Taux ${type.nom} (DH)`,
        key: `rate_${type.id}`,
        width: 18
      });
    });

    const endColumns = [
      { header: 'Distance Parcourue (KM)', key: 'totalDistance', width: 22 },
      { header: 'Total Général (DH)', key: 'grandTotal', width: 18 }
    ];

    // Combine all columns
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
      // Get user's trips for the month
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

      // Initialize user data
      const userData = {
        fullName: user.nomComplete,
        totalTripDays: trips.length,
        totalDistance: 0,
        grandTotal: 0
      };

      // Initialize type-specific data
      const typeDays = {};
      const typeRates = {};

      travelTypes.forEach(type => {
        typeDays[type.id] = 0;
        typeRates[type.id] = 0;
      });

      // First pass: count days and get rates
      for (const trip of trips) {
        const typeId = trip.typeDeDeplacementId;
        
        // Count days by type
        if (typeDays[typeId] !== undefined) {
          typeDays[typeId]++;
        }

        // Get role's rate for this travel type (only set once per type)
        if (typeRates[typeId] === 0) {
          const roleRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === typeId);
          typeRates[typeId] = roleRate ? parseFloat(roleRate.tarifParJour) || 0 : 0;
        }
      }

      // Second pass: calculate costs
      for (const trip of trips) {
        const typeId = trip.typeDeDeplacementId;

        // Calculate distance
        userData.totalDistance += parseFloat(trip.distanceKm) || 0;

        // Calculate costs for this trip
        let tripTotal = 0;

        // Add expenses
        const expensesTotal = getTotalExpenses(trip.depenses);
        tripTotal += expensesTotal;

        // Add daily mission rate (only if this type has days)
        if (typeDays[typeId] > 0) {
          tripTotal += typeRates[typeId];
        }

        // Add kilometric cost using new vehicule rate rule system
        const kilometricCost = calculateKilometricCost(trip, userVehiculeRateRules);
        tripTotal += kilometricCost;

        userData.grandTotal += tripTotal;
      }

      // Prepare row data
      const rowData = { ...userData };

      // Add type-specific data to row
      travelTypes.forEach(type => {
        rowData[`days_${type.id}`] = typeDays[type.id];
        rowData[`rate_${type.id}`] = typeDays[type.id] > 0 ? typeRates[type.id].toFixed(2) : '0.00';
      });

      // Format numbers
      rowData.totalDistance = userData.totalDistance.toFixed(2);
      rowData.grandTotal = userData.grandTotal.toFixed(2);

      // Add row to worksheet
      worksheet.addRow(rowData);
    }

    // Style data rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Skip header row
        row.alignment = { horizontal: 'center', vertical: 'middle' };
        
        // Alternate row colors
        if (rowNumber % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F2F2F2' }
          };
        }
      }
    });

    // Add borders to all cells
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
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

    // Calculate totals for summary
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

    // Write workbook to response
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

        // For each trip
        for (const trip of deplacements) {
          totalDistance += parseFloat(trip.distanceKm) || 0;

          // Total cost = expenses + mission rate + kilometric cost
          const expensesTotal = getTotalExpenses(trip.depenses);

          const travelTypeRate = roleMissionRates.find(
            rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId
          );
          const travelTypeAmount = travelTypeRate ? parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

          // Calculate kilometric cost using new system
          const kilometricCost = calculateKilometricCost(trip, userVehiculeRateRules);

          totalExpenses += expensesTotal + travelTypeAmount + kilometricCost;

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
    const tmpDir = path.join(__dirname, '../tmp');
    await fs.ensureDir(tmpDir);
    const outPath = path.join(tmpDir, `report-${userId}-${year}-${month+1}.xlsx`);
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
    const tmpDir = path.join(__dirname, '../tmp');
    await fs.ensureDir(tmpDir);
    const outPath = path.join(tmpDir, `report-${userId}-${year}-${month + 1}.pdf`);

    const pdfDoc = pdfMake.createPdf(docDefinition);
    await new Promise((resolve, reject) => {
      pdfDoc.getBuffer(buffer => {
        fs.writeFile(outPath, buffer, err => {
          if (err) {
            console.error("Error writing PDF to file:", err);
            return reject(err);
          }
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
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ exportExcel failed:", err);
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
      fs.unlinkSync(filePath);
    });
  } catch (err) {
    console.error("❌ exportPDF failed:", err);
    next(err);
  }
};