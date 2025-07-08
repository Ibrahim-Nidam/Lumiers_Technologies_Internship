const { Op } = require('sequelize');
const os = require('os');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const {
    User, Deplacement, Depense, Role,
    TauxMissionRole, VehiculeRateRule, TypeDeDeplacement, TypeDepense, Chantier
} = require('../models');
const ExcelJS = require('exceljs');
const pdfMake = require('pdfmake/build/pdfmake');
const pdfFonts = require('pdfmake/build/vfs_fonts');
pdfMake.vfs = pdfFonts;
const fs = require('fs-extra');
const path = require('path');
const logo = require('../utils/base64Logo');

// Helper: format "Month Year" in French
const getMonthLabel = (year, month) =>
    new Date(year, month).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
    });

// Helper: get all days in a month
const getDaysInMonth = (year, month) => {
    const days = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
        days.push(new Date(date));
        date.setDate(date.getDate() + 1);
    }
    return days;
};

// Fetch all dashboard data for one user/month
async function getDashboardData(userId, year, month) {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

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
            {
                model: Depense,
                as: 'depenses',
                include: [{ model: TypeDepense, as: 'typeDepense' }]
            },
            { model: VehiculeRateRule, as: 'vehiculeRateRule' },
            { model: Chantier, as: 'chantier' }
        ],
        order: [['date', 'ASC']]
    });

    const roleMissionRates = await TauxMissionRole.findAll({ where: { roleId: userInfo.roleId } });
    const userVehiculeRateRules = await VehiculeRateRule.findAll({ where: { userId: userInfo.id, active: true } });
    const travelTypes = await TypeDeDeplacement.findAll();

    return { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes };
}

function getTotalExpenses(depenses) {
    return depenses.reduce((sum, expense) => sum + (parseFloat(expense.montant) || 0), 0);
}

/**
 * FIXED: Helper function to calculate kilometric cost.
 * This version only calculates costs for trips where a vehicle rate rule was explicitly selected.
 */
function calculateTotalKilometricCost(trips, userVehiculeRateRules) {
    const groupedByRate = {};

    for (const trip of trips) {
        if (trip.vehiculeRateRuleId) {
            const ruleId = trip.vehiculeRateRuleId;
            if (!groupedByRate[ruleId]) {
                groupedByRate[ruleId] = [];
            }
            groupedByRate[ruleId].push(trip);
        }
    }

    let totalDistanceCost = 0;

    for (const ruleId in groupedByRate) {
        const tripsForRule = groupedByRate[ruleId];
        const distanceSum = tripsForRule.reduce((sum, trip) => sum + (parseFloat(trip.distanceKm) || 0), 0);

        let rule = null;
        const firstTripWithRule = tripsForRule.find(t => t.vehiculeRateRule);
        if (firstTripWithRule) {
            rule = firstTripWithRule.vehiculeRateRule;
        } else {
            rule = userVehiculeRateRules.find(r => r.id === parseInt(ruleId));
        }

        if (!rule || distanceSum === 0) continue;

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

    const users = await User.findAll({
      where: { estActif: true },
      include: [
        {
          model: Role,
          as: 'role',
          where: {
            nom: {
              [Op.notIn]: ['agent', 'manager']
            }
          }
        }
      ],
      order: [['nomComplete', 'ASC']]
    });

    const travelTypes = await TypeDeDeplacement.findAll();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Récapitulatif Mensuel');

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

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4472C4' }
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

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

      const totalKilometricCost = calculateTotalKilometricCost(trips, userVehiculeRateRules);

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

      userData.grandTotal = totalOtherCosts + totalKilometricCost;

      const rowData = { ...userData };
      travelTypes.forEach(type => {
        rowData[`days_${type.id}`] = typeDays[type.id];
        rowData[`rate_${type.id}`] = typeDays[type.id] > 0 ? typeRates[type.id].toFixed(2) : '0.00';
      });

      rowData.totalDistance = userData.totalDistance.toFixed(2);
      rowData.grandTotal = userData.grandTotal.toFixed(2);

      worksheet.addRow(rowData);
    }

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
            include: [
                {
                    model: Role,
                    as: 'role',
                    where: {
                        nom: { [Op.notIn]: ['agent', 'manager'] }
                    }
                }
            ]
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

                for (const trip of deplacements) {
                    totalDistance += parseFloat(trip.distanceKm) || 0;

                    const expensesTotal = getTotalExpenses(trip.depenses);

                    const travelTypeRate = roleMissionRates.find(
                        rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId
                    );
                    const travelTypeAmount = travelTypeRate ? parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

                    totalExpenses += expensesTotal + travelTypeAmount;

                    for (const expense of trip.depenses) {
                        const justificatif = expense.cheminJustificatif;
                        if (justificatif && justificatif.trim() !== "") {
                            justified++;
                        } else {
                            unjustified++;
                        }
                    }
                }
                
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
    const groupedByRate = {};
    const distanceCosts = new Map();

    trips.forEach(trip => {
        const ruleId = trip.vehiculeRateRuleId;
        if (ruleId) {
            if (!groupedByRate[ruleId]) groupedByRate[ruleId] = [];
            groupedByRate[ruleId].push(trip);
        }
    });

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
                totalCost = (totalDistance <= threshold)
                    ? totalDistance * before
                    : (threshold * before) + ((totalDistance - threshold) * after);
            }
            const ruleLabel = rule.name || `Règle ${ruleId}`;
            distanceCosts.set(ruleLabel, {
                distance: totalDistance,
                total: totalCost,
                rate: rule.rateBeforeThreshold,
                rateAfter: rule.rateAfterThreshold,
                threshold: rule.thresholdKm,
                conditionType: rule.conditionType
            });
        }
    }
    return distanceCosts;
};

/**
 * Generate Excel file with updated structure and styling.
 */
exports.generateExcelReport = async (userId, year, month) => {
    try {
        const { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes } =
            await getDashboardData(userId, year, month);
        const label = getMonthLabel(year, month);
        const fullName = userInfo.nomComplete;

        const calculateTotals = () => {
            const dailyAllowances = new Map();
            let totalMisc = 0;
            let miscCount = 0;

            trips.forEach(trip => {
                if (Array.isArray(trip.depenses)) {
                    miscCount += trip.depenses.length;
                    trip.depenses.forEach(expense => {
                        totalMisc += parseFloat(expense.montant) || 0;
                    });
                }
                const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
                if (missionRate) {
                    const rate = parseFloat(missionRate.tarifParJour) || 0;
                    const travelTypeName = travelTypes.find(type => type.id === trip.typeDeDeplacementId)?.nom || 'Type Inconnu';
                    if (!dailyAllowances.has(rate)) {
                        dailyAllowances.set(rate, { count: 0, total: 0, name: travelTypeName });
                    }
                    const current = dailyAllowances.get(rate);
                    current.count++;
                    current.total += rate;
                }
            });

            const mileageCosts = calculateDistanceCostsForExport(trips, userVehiculeRateRules);
            let grandTotal = totalMisc;
            mileageCosts.forEach(value => grandTotal += value.total);
            dailyAllowances.forEach(value => grandTotal += value.total);

            return { totalMisc, miscCount, mileageCosts, dailyAllowances, grandTotal };
        };

        const totals = calculateTotals();
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Rapport Complet');
        let currentRow = 1;

        // --- Styling Helper ---
        const styleRow = (row, startCol = 1) => {
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                if (colNumber > startCol) {
                    cell.alignment = { vertical: 'middle', horizontal: 'center' };
                } else {
                    cell.alignment = { vertical: 'middle', horizontal: 'left' };
                }
            });
        };

        // --- Header ---
        const imgId = wb.addImage({ base64: logo, extension: 'png' });
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
        ws.mergeCells('D1:E2');
        ws.getCell('D1').value = `Nom et Prénom : ${fullName}`;
        ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
        ws.getCell('D1').font = { size: 12 };
        currentRow = 4;

        // --- Title ---
        ws.mergeCells(`A${currentRow}:E${currentRow}`);
        ws.getCell(`A${currentRow}`).value = `Note de frais – ${label}`;
        ws.getCell(`A${currentRow}`).font = { size: 16, bold: true, color: { argb: 'FF4F81BD' } };
        ws.getCell(`A${currentRow}`).alignment = { horizontal: 'center' };
        currentRow += 2;

        // --- Get all days in the month ---
        const daysInMonth = getDaysInMonth(year, month);

        // --- SECTION 1: Detailed Trips ---
        ws.getCell(`A${currentRow}`).value = 'DÉTAIL DES TRAJETS';
        ws.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        currentRow++;

        const travelTypeNames = travelTypes.map(t => t.nom);
        const tripsHeaderRow = ws.getRow(currentRow);
        const dynamicHeaders = ['Date', 'Lieu de deplacement', 'Chantier', ...travelTypeNames];
        tripsHeaderRow.values = dynamicHeaders;
        tripsHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        currentRow++;

        daysInMonth.forEach(day => {
            const trip = trips.find(t => new Date(t.date).toDateString() === day.toDateString());
            const tripRow = ws.getRow(currentRow);
            const rowData = [
                day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                trip ? trip.chantier?.designation || 'N/A' : '',
                trip ? trip.chantier?.codeChantier || 'N/A' : ''
            ];
            travelTypeNames.forEach(typeName => {
                if (trip) {
                    const travelType = travelTypes.find(t => t.id === trip.typeDeDeplacementId);
                    rowData.push((travelType && travelType.nom === typeName) ? 1 : '');
                } else {
                    rowData.push('');
                }
            });
            tripRow.values = rowData;
            styleRow(tripRow);
            currentRow++;
        });

        // --- Summary for Detailed Trips ---
        const summaryData = { counts: {}, rates: {}, totals: {} };
        let grandTotalTrips = 0;
        travelTypes.forEach(type => {
            const count = trips.filter(trip => trip.typeDeDeplacementId === type.id).length;
            const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === type.id);
            const rate = missionRate ? parseFloat(missionRate.tarifParJour) : 0;
            const total = count * rate;
            summaryData.counts[type.nom] = count;
            summaryData.rates[type.nom] = rate;
            summaryData.totals[type.nom] = total;
            grandTotalTrips += total;
        });

        const summaryRows = [
            { label: 'Nombre de jours', data: summaryData.counts, format: '0' },
            { label: 'Taux de mission', data: summaryData.rates, format: '#,##0.00 "MAD"' },
            { label: 'Total', data: summaryData.totals, format: '#,##0.00 "MAD"' }
        ];

        summaryRows.forEach(({ label, data, format }) => {
            const row = ws.getRow(currentRow);
            const values = [label, '', '', ...travelTypeNames.map(name => data[name])];
            row.values = values;
            
            // Merge the empty cells (B and C) with the first cell (A)
            ws.mergeCells(`A${currentRow}:C${currentRow}`);
            
            styleRow(row);
            row.font = { bold: true };
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber > 3) cell.numFmt = format;
            });
            currentRow++;
        });

        const grandTotalRow = ws.getRow(currentRow);
        grandTotalRow.values = ['Total General', '', '', grandTotalTrips];
        
        // Merge the empty cells (B and C) with the first cell (A)
        ws.mergeCells(`A${currentRow}:C${currentRow}`);
        
        grandTotalRow.getCell(4).numFmt = '#,##0.00 "MAD"';
        grandTotalRow.font = { bold: true, size: 12 };
        styleRow(grandTotalRow);
        currentRow += 2;

        // --- SECTION 2: Miscellaneous Expenses ---
        ws.getCell(`A${currentRow}`).value = 'DÉPENSES DIVERSES';
        ws.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        currentRow++;
        const expensesHeaderRow = ws.getRow(currentRow);
        expensesHeaderRow.values = ['Date du Trajet', 'Type de Dépense', 'Montant (MAD)', 'Justificatif'];
        expensesHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        currentRow++;

        daysInMonth.forEach(day => {
            const tripsOnDay = trips.filter(t => new Date(t.date).toDateString() === day.toDateString());
            const expensesOnDay = tripsOnDay.flatMap(trip => trip.depenses || []);
            if (expensesOnDay.length > 0) {
                expensesOnDay.forEach(expense => {
                    const expenseRow = ws.getRow(currentRow);
                    expenseRow.values = [
                        day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                        expense.typeDepense?.nom || 'N/A',
                        parseFloat(expense.montant) || 0,
                        expense.cheminJustificatif ? 'Oui' : 'Non'
                    ];
                    styleRow(expenseRow);
                    expenseRow.getCell(3).numFmt = '#,##0.00 "MAD"';
                    currentRow++;
                });
            } else {
                const noExpenseRow = ws.getRow(currentRow);
                noExpenseRow.values = [
                    day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    '',
                    '',
                    ''
                ];
                styleRow(noExpenseRow);
                currentRow++;
            }
        });

        const totalExpensesRow = ws.getRow(currentRow);
        totalExpensesRow.values = ['Total', '', totals.totalMisc];
        ws.mergeCells(`A${currentRow}:B${currentRow}`);
        styleRow(totalExpensesRow, 0);
        totalExpensesRow.font = { bold: true };
        totalExpensesRow.getCell(3).numFmt = '#,##0.00 "MAD"';
        currentRow += 3;

        // --- NEW SECTION: Distance Table ---
        ws.getCell(`A${currentRow}`).value = 'DISTANCES PARCOURUES';
        ws.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        currentRow++;

        const distanceHeaderRow = ws.getRow(currentRow);
        distanceHeaderRow.values = ['Date', 'Lieu de deplacement', 'Distance (Km)'];
        distanceHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        currentRow++;

        let totalDistance = 0;
        daysInMonth.forEach(day => {
            const trip = trips.find(t => new Date(t.date).toDateString() === day.toDateString());
            const distance = trip ? parseFloat(trip.distanceKm) || 0 : 0;
            totalDistance += distance;
            const distanceRow = ws.getRow(currentRow);
            distanceRow.values = [
                day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                trip ? trip.chantier?.designation || 'N/A' : '',
                distance
            ];
            styleRow(distanceRow);
            distanceRow.getCell(3).numFmt = '0.00';
            currentRow++;
        });

        const totalDistanceRow = ws.getRow(currentRow);
        totalDistanceRow.values = ['Total', '', totalDistance];
        ws.mergeCells(`A${currentRow}:B${currentRow}`);
        styleRow(totalDistanceRow, 0);
        totalDistanceRow.font = { bold: true };
        totalDistanceRow.getCell(3).numFmt = '0.00';
        currentRow++;

        if (totals.mileageCosts.size > 1) {
            Array.from(totals.mileageCosts.entries()).forEach(([libelle, { rate, distance}]) => {
                const tauxRow = ws.getRow(currentRow);
                tauxRow.values = [`Taux (${libelle})`, '', `${rate.toFixed(2)} - ${distance.toFixed(2)} Km`];
                ws.mergeCells(`A${currentRow}:B${currentRow}`);
                styleRow(tauxRow, 0);
                tauxRow.font = { bold: true };
                tauxRow.getCell(3).numFmt = '#,##0.00 "MAD"';
                currentRow++;
            });
        } else {
            const tauxRow = ws.getRow(currentRow);
            const first = totals.mileageCosts.values().next().value || { rate: 0 };
            tauxRow.values = ['Taux', '', first.rate.toFixed(2)];
            ws.mergeCells(`A${currentRow}:B${currentRow}`);
            styleRow(tauxRow, 0);
            tauxRow.font = { bold: true };
            tauxRow.getCell(3).numFmt = '#,##0.00 "MAD"';
            currentRow++;
        }

        const netPayerRow = ws.getRow(currentRow);
        const totalMileageCost = Array.from(totals.mileageCosts.values()).reduce((sum, c) => sum + c.total, 0);
        netPayerRow.values = ['Net à payer', '', totalMileageCost];
        ws.mergeCells(`A${currentRow}:B${currentRow}`);
        styleRow(netPayerRow, 0);
        netPayerRow.font = { bold: true };
        netPayerRow.getCell(3).numFmt = '#,##0.00 "MAD"';
        // Apply fill only to the "Net à payer" cell (column A)
        netPayerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        currentRow += 3;

        // --- SECTION 3: Récapitulatif ---
        ws.getCell(`A${currentRow}`).value = 'RÉCAPITULATIF';
        ws.getCell(`A${currentRow}`).font = { size: 14, bold: true };
        ws.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
        currentRow++;
        const summaryHeaderRow = ws.getRow(currentRow);
        summaryHeaderRow.values = ['Désignation', 'Chantier', 'Quantité', 'Taux / J', 'Montant'];
        summaryHeaderRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        currentRow++;

        const miscSummaryRow = ws.getRow(currentRow);
        miscSummaryRow.values = ['Feuille de depens', '', totals.miscCount, '-', totals.totalMisc];
        styleRow(miscSummaryRow);
        miscSummaryRow.getCell(5).numFmt = '#,##0.00 "MAD"';
        currentRow++;

        totals.dailyAllowances.forEach(({ count, total, name }, rate) => {
            const allowanceRow = ws.getRow(currentRow);
            allowanceRow.values = [`Frais journaliers (${name})`, '', count, rate, total];
            styleRow(allowanceRow);
            allowanceRow.getCell(4).numFmt = '#,##0.00 "MAD"';
            allowanceRow.getCell(5).numFmt = '#,##0.00 "MAD"';
            currentRow++;
        });

        if (totals.mileageCosts.size > 0) {
            totals.mileageCosts.forEach(({ distance, total, rate, conditionType, threshold, rateAfter }, libelle) => {
                const rateDisplay = (conditionType === "THRESHOLD" && threshold && rateAfter !== rate)
                    ? `${rate.toFixed(2)}/${rateAfter.toFixed(2)} (seuil: ${threshold}km)`
                    : rate.toFixed(2);
                const mileageRow = ws.getRow(currentRow);
                mileageRow.values = [`Frais kilométrique (${libelle})`, '', `${distance.toFixed(2)} Km`, rateDisplay, total];
                styleRow(mileageRow);
                mileageRow.getCell(5).numFmt = '#,##0.00 "MAD"';
                currentRow++;
            });
        } else {
            // Add empty Frais kilométrique row if no data
            const emptyMileageRow = ws.getRow(currentRow);
            emptyMileageRow.values = ['Frais kilométrique', '', '', '', ''];
            styleRow(emptyMileageRow);
            emptyMileageRow.getCell(5).numFmt = '#,##0.00 "MAD"';
            currentRow++;
        }

        const finalTotalRow = ws.getRow(currentRow);
        finalTotalRow.values = ['Total Dépense', '', '', '', totals.grandTotal];
        ws.mergeCells(`A${currentRow}:D${currentRow}`);
        const totalLabelCell = ws.getCell(`A${currentRow}`);
        totalLabelCell.font = { bold: true, size: 12 };
        totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };
        totalLabelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const grandTotalCell = ws.getCell(`E${currentRow}`);
        grandTotalCell.numFmt = '#,##0.00 "MAD"';
        grandTotalCell.font = { bold: true, size: 12 };
        grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        grandTotalCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };

        // --- IMPROVED Auto-width columns based on content ---
        ws.columns.forEach((column, index) => {
            let maxLength = 0;
            
            // Check all cells in this column to find the longest content
            column.eachCell({ includeEmpty: true }, (cell) => {
                if (cell.value) {
                    const cellValue = cell.value.toString();
                    maxLength = Math.max(maxLength, cellValue.length);
                }
            });
            
            // Set minimum width of 12 or use the longest content length
            const minWidth = 12;
            column.width = maxLength < minWidth ? minWidth : maxLength + 2; // +2 for padding
            
            // Set maximum width to prevent overly wide columns
            const maxWidth = 50;
            if (column.width > maxWidth) {
                column.width = maxWidth;
            }
        });

        // --- Write to file ---
        const tmpDir = path.join(os.tmpdir(), 'myapp-reports');
        await fs.ensureDir(tmpDir);
        const outPath = path.join(tmpDir, `report-${userId}-${year}-${month + 1}-${uuidv4()}.xlsx`);
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
    const { userInfo, trips, roleMissionRates, userVehiculeRateRules, travelTypes } =
      await getDashboardData(userId, year, month);
    const label = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    const calculateTotals = () => {
      const dailyAllowances = new Map();
      let totalMiscExpenses = 0;
      let miscExpensesCount = 0;

      trips.forEach(trip => {
        if (trip.depenses && Array.isArray(trip.depenses)) {
          miscExpensesCount += trip.depenses.length;
          trip.depenses.forEach(expense => {
            totalMiscExpenses += parseFloat(expense.montant) || 0;
          });
        }

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

      const mileageCosts = calculateDistanceCostsForExport(trips, userVehiculeRateRules);

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

    totals.dailyAllowances.forEach((data, rate) => {
      tableBody.push([
        `Frais journaliers (${data.name})`,
        '',
        { text: `${data.count}`, alignment: 'right' },
        { text: rate.toFixed(2), alignment: 'right' },
        { text: data.total.toFixed(2), alignment: 'right' }
      ]);
    });

    // Handle mileage costs - show empty row if no data
    if (totals.mileageCosts.size === 0) {
      tableBody.push([
        'Frais kilométrique',
        '',
        { text: '-', alignment: 'right' },
        { text: '-', alignment: 'right' },
        { text: '-', alignment: 'right' }
      ]);
    } else {
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
    }

    tableBody.push([
      { text: 'Total Dépense', colSpan: 4, alignment: 'right', bold: true, fillColor: '#f0f0f0' },
      {}, {}, {},
      { text: totals.grandTotal.toFixed(2), bold: true, alignment: 'right', fillColor: '#f0f0f0' }
    ]);

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
          toasterSize: 12,
          alignment: 'right'
        }
      },
      defaultStyle: {
        fontSize: 10
      }
    };

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

async function generateUserWorksheet(workbook, userId, year, month) {
    // Fetch user details
    const user = await User.findByPk(userId);
    if (!user) throw new Error(`User with id ${userId} not found`);

    // Define the date range for the month
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);

    // Fetch user's trips for the month
    const trips = await Deplacement.findAll({
        where: { userId, date: { [Op.between]: [start, end] } },
        include: [
            { model: Chantier, as: 'chantier' },
            { model: TypeDeDeplacement, as: 'typeDeDeplacement' }
        ],
        order: [['date', 'ASC']]
    });

    // Fetch all travel types
    const travelTypes = await TypeDeDeplacement.findAll();
    const travelTypeNames = travelTypes.map(t => t.nom);

    // Create worksheet with user's full name as sheet name
    const ws = workbook.addWorksheet(user.nomComplete);

    // Add logo
    const imgId = workbook.addImage({ base64: logo, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });

    // Add user name
    ws.mergeCells('D1:E2');
    ws.getCell('D1').value = `Nom et Prénom : ${user.nomComplete}`;
    ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('D1').font = { size: 12 };

    // Add title with French month label
    const label = getMonthLabel(year, month);
    ws.mergeCells('A3:E3');
    ws.getCell('A3').value = `Fiche de Deplacement - ${label}`;
    ws.getCell('A3').font = { size: 16, bold: true, color: { argb: 'FF4F81BD' } };
    ws.getCell('A3').alignment = { horizontal: 'center' };

    // Add table header (without 'Jours avec déplacement')
    const headers = ['Date', 'Lieu de deplacement', 'Chantier', ...travelTypeNames];
    const headerRow = ws.getRow(5);
    headerRow.values = headers;
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Add daily trip rows and calculate totals
    const daysInMonth = getDaysInMonth(year, month);
    let currentRow = 6;
    const tripTypeTotals = new Array(travelTypeNames.length).fill(0); // Array to store totals

    daysInMonth.forEach(day => {
        const tripsOnDay = trips.filter(t => new Date(t.date).toDateString() === day.toDateString());
        const hasTrip = tripsOnDay.length > 0;
        const rowData = [
            day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            hasTrip ? tripsOnDay[0].chantier?.designation || 'N/A' : '',
            hasTrip ? tripsOnDay[0].chantier?.codeChantier || 'N/A' : '',
            ...travelTypeNames.map((typeName, index) => {
                const used = tripsOnDay.some(trip => trip.typeDeDeplacement?.nom === typeName);
                if (used) {
                    tripTypeTotals[index] += 1; // Increment total for this trip type
                }
                return used ? 1 : null; // Set 1 if used, null (empty) if not
            })
        ];
        const row = ws.getRow(currentRow);
        row.values = rowData;
        row.eachCell({ includeEmpty: true }, cell => {
            cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        currentRow++;
    });

    // Add summary row with calculated totals
    const summaryRow = ws.getRow(currentRow);
    
    // Merge cells from column A to C for "Total" label
    const totalColumnCount = 3; // A, B, C columns
    const startCol = 'A';
    const endCol = String.fromCharCode(65 + totalColumnCount - 1); // Convert to column letter (C)
    ws.mergeCells(`${startCol}${currentRow}:${endCol}${currentRow}`);
    
    summaryRow.getCell(1).value = 'Total';
    summaryRow.getCell(1).font = { bold: true };
    summaryRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Add totals for each travel type
    tripTypeTotals.forEach((total, index) => {
        summaryRow.getCell(4 + index).value = total; // Set static total value (column D=4, E=5, etc.)
        summaryRow.getCell(4 + index).font = { bold: true };
    });
    
    summaryRow.eachCell({ includeEmpty: true }, cell => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Auto-width columns based on content
    ws.columns.forEach((column, index) => {
        let maxLength = 0;
        
        // Check header length
        if (headers[index]) {
            maxLength = Math.max(maxLength, headers[index].length);
        }
        
        // Check all cells in this column
        column.eachCell({ includeEmpty: false }, cell => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // Set width with some padding, but with reasonable min/max limits
        const calculatedWidth = Math.max(8, Math.min(maxLength + 2, 50));
        column.width = calculatedWidth;
    });

    return ws;
}

// API endpoint to generate Excel file with multiple sheets (one per user)
exports.generateTripTablesZip = async (req, res, next) => {
    try {
        // Validate query parameters
        const { year, month } = req.query;
        if (!year || month === undefined) {
            return res.status(400).json({ error: "Missing year or month parameters" });
        }

        // Fetch all active users
        const users = await User.findAll({
            where: { estActif: true },
            include: [
                {
                    model: Role,
                    as: 'role',
                    where: {
                        nom: {
                            [Op.notIn]: ['agent', 'manager']
                        }
                    }
                }
            ]
        });

        // Generate Excel file name (using the same format as the previous ZIP name)
        const label = getMonthLabel(+year, +month);
        const safeLabel = label.replace(/\s+/g, '_');
        const excelName = `fiche_de_deplacement_des_utilisateurs_${safeLabel}.xlsx`;

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();

        // Generate worksheet for each user
        for (const user of users) {
            try {
                await generateUserWorksheet(workbook, user.id, +year, +month);
            } catch (err) {
                console.error(`Failed to generate worksheet for user ${user.id}:`, err);
                // Continue with other users even if one fails
            }
        }

        // Create temporary directory for Excel file
        const tmpDir = path.join(os.tmpdir(), 'myapp-reports');
        await fs.ensureDir(tmpDir);
        const excelPath = path.join(tmpDir, `${uuidv4()}.xlsx`);

        // Write the Excel file
        await workbook.xlsx.writeFile(excelPath);

        // Set response headers
        res.setHeader('Content-Disposition', `attachment; filename="${excelName}"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Send the file and delete it afterward
        res.download(excelPath, excelName, async err => {
            if (err) console.error("Download error:", err);
            try {
                await fs.remove(excelPath);
            } catch (unlinkErr) {
                console.error('Failed to delete Excel file:', unlinkErr);
            }
        });

    } catch (err) {
        console.error("generateTripTablesZip error:", err);
        next(err);
    }
};