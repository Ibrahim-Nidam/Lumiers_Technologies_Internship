import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import logo from './base64Logo';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Returns a human-readable label for the given year and month as a string.
 *
 * @param {number} year - The year to get the label for.
 * @param {number} month - The month to get the label for (0-11).
 * @returns {string} The month label in the format "MonthName Year" (e.g. "Fevrier 2022").
 */
export const getMonthLabel = (year, month) => {
    return new Date(year, month).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
    });
};

const getDaysInMonth = (year, month) => {
  const days = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
};

/**
 * Helper function to get the full name of the target user
 * Handles both user and manager access scenarios
 * Priority: dashboardData.userInfo -> currentUser -> fallback
 */
const getTargetUserFullName = (dashboardData, currentUser) => {
    const { userInfo } = dashboardData;
    
    // Try to get name from userInfo (target user's data)
    if (userInfo) {
        if (userInfo.fullName && userInfo.fullName.trim()) {
            return userInfo.fullName.trim();
        }
        
        if (userInfo.firstName && userInfo.lastName) {
            return `${userInfo.firstName.trim()} ${userInfo.lastName.trim()}`;
        }
        
        if (userInfo.prenom && userInfo.nom) {
            return `${userInfo.prenom.trim()} ${userInfo.nom.trim()}`;
        }
        
        if (userInfo.name && userInfo.name.trim()) {
            return userInfo.name.trim();
        }
    }
    
    if (currentUser) {
        if (currentUser.fullName && currentUser.fullName.trim()) {
            return currentUser.fullName.trim();
        }
        
        if (currentUser.firstName && currentUser.lastName) {
            return `${currentUser.firstName.trim()} ${currentUser.lastName.trim()}`;
        }
        
        if (currentUser.prenom && currentUser.nom) {
            return `${currentUser.prenom.trim()} ${currentUser.nom.trim()}`;
        }
        
        if (currentUser.name && currentUser.name.trim()) {
            return currentUser.name.trim();
        }
    }
    
    if (userInfo?.id) {
        return `Utilisateur ${userInfo.id}`;
    }
    
    if (currentUser?.id) {
        return `Utilisateur ${currentUser.id}`;
    }
    
    return 'Utilisateur Inconnu';
};

/**
 * Helper function to calculate distance costs with threshold logic for export
 */
const calculateDistanceCostsForExport = (trips, userCarLoans) => {
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
        const rule = userCarLoans?.find(r => r.id === parseInt(ruleId));

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

            const ruleLabel = rule.name || rule.libelle || `Règle ${ruleId}`;
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
 * Auto-widths columns based on content.
 * @param {ExcelJS.Worksheet} worksheet - The worksheet to adjust.
 */
const autoWidthColumns = (worksheet) => {
    worksheet.columns.forEach(column => {
        let maxTextLength = 0;
        column.eachCell({ includeEmpty: true }, cell => {
            const textLength = (cell.value || '').toString().length;
            if (textLength > maxTextLength) {
                maxTextLength = textLength;
            }
        });
        column.width = maxTextLength < 12 ? 14 : maxTextLength + 4;
    });
};

/**
 * Export the specified user's data for the current month as an Excel file.
 *
 * @param {number} year - The year to export (e.g. 2022).
 * @param {number} month - The month to export (0-11, where 0 = January).
 * @param {Object} dashboardData - The dashboard data to export.
 * @param {Object} currentUser - The current user session data.
 *
 * @returns {Promise<void>}
 */
export const handleExcelExport = async (year, month, dashboardData, currentUser = null) => {
    try {
        const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;
        const label = getMonthLabel(year, month);
        const fullName = getTargetUserFullName(dashboardData, currentUser);
        const roleMissionRates = userMissionRates;

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

            const mileageCosts = calculateDistanceCostsForExport(trips, userCarLoans);
            let grandTotal = totalMisc;
            mileageCosts.forEach(value => grandTotal += value.total);
            dailyAllowances.forEach(value => grandTotal += value.total);

            return { totalMisc, miscCount, mileageCosts, dailyAllowances, grandTotal };
        };

        const totals = calculateTotals();
        const daysInMonth = getDaysInMonth(year, month);
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Rapport Complet');
        let currentRow = 1;

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
            row.getCell(1).value = label;
            ws.mergeCells(`A${currentRow}:C${currentRow}`);
            travelTypeNames.forEach((name, i) => {
                row.getCell(4 + i).value = data[name];
                row.getCell(4 + i).numFmt = format;
            });
            styleRow(row);
            row.font = { bold: true };
            currentRow++;
        });

        const grandTotalRow = ws.getRow(currentRow);
        grandTotalRow.getCell(1).value = 'Total General';
        ws.mergeCells(`A${currentRow}:C${currentRow}`);
        const startCol = 4;
        const endCol = startCol + travelTypeNames.length - 1;
        ws.mergeCells(startCol, currentRow, endCol, currentRow);
        grandTotalRow.getCell(startCol).value = grandTotalTrips;
        grandTotalRow.getCell(startCol).numFmt = '#,##0.00 "MAD"';
        grandTotalRow.getCell(startCol).alignment = { horizontal: 'center', vertical: 'middle' };
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

        // --- SECTION 3: Distance Table ---
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

        const totalDistance = trips.reduce((sum, trip) => sum + (parseFloat(trip.distanceKm) || 0), 0);
        daysInMonth.forEach(day => {
            const trip = trips.find(t => new Date(t.date).toDateString() === day.toDateString());
            const distance = trip ? parseFloat(trip.distanceKm) || 0 : 0;
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

        const netPayerRow = currentRow;
        const totalMileageCost = Array.from(totals.mileageCosts.values()).reduce((sum, c) => sum + c.total, 0);
        ws.mergeCells(`A${netPayerRow}:B${netPayerRow}`);
        const netPayerCell = ws.getCell(`A${netPayerRow}`);
        netPayerCell.value = 'Net à payer';
        netPayerCell.font = { bold: true };
        netPayerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        netPayerCell.alignment = { horizontal: 'center', vertical: 'middle' };
        netPayerCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const valueCell = ws.getCell(`C${netPayerRow}`);
        valueCell.value = totalMileageCost;
        valueCell.numFmt = '#,##0.00 "MAD"';
        valueCell.font = { bold: true };
        valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
        valueCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        currentRow += 3;

        // --- SECTION 4: Récapitulatif ---
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
            const emptyMileageRow = ws.getRow(currentRow);
            emptyMileageRow.values = ['Frais kilométrique', '', '0.00 Km', '0.00', 0];
            styleRow(emptyMileageRow);
            emptyMileageRow.getCell(5).numFmt = '#,##0.00 "MAD"';
            currentRow++;
        }

        const finalTotalRow = ws.getRow(currentRow);
        finalTotalRow.values = ['Total Dépense', '', '', '', totals.grandTotal];
        ws.mergeCells(`A${currentRow}:D${currentRow}`);
        const totalLabelCell = ws.getCell(`A${currentRow}`);
        totalLabelCell.font = { bold: true, size: 12 };
        totalLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
        totalLabelCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        const grandTotalCell = ws.getCell(`E${currentRow}`);
        grandTotalCell.numFmt = '#,##0.00 "MAD"';
        grandTotalCell.font = { bold: true, size: 12 };
        grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };
        grandTotalCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        grandTotalCell.alignment = { horizontal: 'right', vertical: 'middle' };

        autoWidthColumns(ws);

        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf]), `Note_de_frais_${fullName}_${year}_${month + 1}.xlsx`);
    } catch (err) {
        console.error("❌ handleExcelExport failed:", err);
        alert('Une erreur est survenue lors de la génération du fichier Excel.');
    }
};


/**
 * Generates a PDF file for the specified month and dashboard data.
 *
 * @param {number} year - The year of the month to generate a PDF for.
 * @param {number} month - The month to generate a PDF for (0-11).
 * @param {Object} dashboardData - The dashboard data to include in the PDF.
 *
 * @returns {Promise<void>} A Promise that resolves when the PDF has been generated and downloaded.
 */
export const handlePDFExport = async (year, month, dashboardData) => {
    const label = getMonthLabel(year, month);

    pdfMake.vfs = pdfFonts.vfs;
    pdfMake.fonts = {
        Roboto: {
            normal: 'Roboto-Regular.ttf',
            bold: 'Roboto-Medium.ttf',
            italics: 'Roboto-Italic.ttf',
            bolditalics: 'Roboto-MediumItalic.ttf'
        }
    };

    const calculateTotals = () => {
        const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;

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

            const missionRate = userMissionRates.find(rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId);
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

        const mileageCosts = calculateDistanceCostsForExport(trips, userCarLoans);

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
    const userInfo = dashboardData.userInfo || {};

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

    if (totals.mileageCosts.size === 0) {
        tableBody.push([
            'Frais kilométrique',
            '',
            { text: '0.00 Km', alignment: 'right' },
            { text: '0.00', alignment: 'right' },
            { text: '0.00', alignment: 'right' }
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
                    { text: `Nom et Prénom : ${userInfo.fullName || ''}`, style: 'userInfo', alignment: 'right' }
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

    try {
        pdfMake.createPdf(docDefinition).download(`Note_de_frais_${userInfo.fullName}_${year}_${month + 1}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Une erreur est survenue lors de la génération du PDF');
    }
};

/**
 * Opens a print dialog with an HTML representation of the Excel data.
 *
 * @param {number} year - The year to print (e.g., 2022).
 * @param {number} month - The month to print (0-11, where 0 = January).
 * @param {Object} dashboardData - The dashboard data to print.
 */
export const handlePrintExcel = async (year, month, dashboardData) => {
    try {
        const { userInfo, trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;
        const label = getMonthLabel(year, month);
        const fullName = userInfo?.fullName || 'N/A';
        const roleMissionRates = userMissionRates;

        const createTableChunks = (rows, chunkSize = 15) => {
            const chunks = [];
            for (let i = 0; i < rows.length; i += chunkSize) {
                chunks.push(rows.slice(i, i + chunkSize));
            }
            return chunks;
        };

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

            const mileageCosts = calculateDistanceCostsForExport(trips, userCarLoans);
            let grandTotal = totalMisc;
            mileageCosts.forEach(value => grandTotal += value.total);
            dailyAllowances.forEach(value => grandTotal += value.total);

            return { totalMisc, miscCount, mileageCosts, dailyAllowances, grandTotal };
        };

        const totals = calculateTotals();
        const daysInMonth = getDaysInMonth(year, month);
        const travelTypeNames = travelTypes.map(t => t.nom);
        const grandTotalTrips = Array.from(totals.dailyAllowances.values()).reduce((sum, { total }) => sum + total, 0);

        const totalDistance = trips.reduce((sum, trip) => sum + (parseFloat(trip.distanceKm) || 0), 0);

        const generateTripsTableInChunks = (daysInMonth, trips, travelTypeNames, travelTypes) => {
            const chunks = createTableChunks(daysInMonth, 20);
            return chunks.map((chunk, index) => `
                ${index > 0 ? '<div class="page-break"></div>' : ''}
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Lieu de deplacement</th>
                            <th>Chantier</th>
                            ${travelTypeNames.map(name => `<th>${name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${chunk.map(day => {
                            const trip = trips.find(t => new Date(t.date).toDateString() === day.toDateString());
                            const rowData = [
                                day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                                trip ? trip.chantier?.designation || 'N/A' : '',
                                trip ? trip.chantier?.codeChantier || 'N/A' : '',
                                ...travelTypeNames.map(typeName => {
                                    if (trip) {
                                        const travelType = travelTypes.find(t => t.id === trip.typeDeDeplacementId);
                                        return (travelType && travelType.nom === typeName) ? '1' : '';
                                    }
                                    return '';
                                })
                            ];
                            return `<tr>${rowData.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
                        }).join('')}
                    </tbody>
                </table>
            `).join('');
        };

        const generateMiscExpensesTableInChunks = (daysInMonth, trips) => {
            const chunks = createTableChunks(daysInMonth, 20);
            return chunks.map((chunk, index) => `
                ${index > 0 ? '<div class="page-break"></div>' : ''}
                <table>
                    <thead>
                        <tr>
                            <th>Date du Trajet</th>
                            <th>Type de Dépense</th>
                            <th>Montant (MAD)</th>
                            <th>Justificatif</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chunk.map(day => {
                            const tripsOnDay = trips.filter(t => new Date(t.date).toDateString() === day.toDateString());
                            const expensesOnDay = tripsOnDay.flatMap(trip => trip.depenses || []);
                            if (expensesOnDay.length > 0) {
                                return expensesOnDay.map(expense => `
                                    <tr>
                                        <td>${day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                        <td>${expense.typeDepense?.nom || 'N/A'}</td>
                                        <td class="currency">${(parseFloat(expense.montant) || 0).toFixed(2)}</td>
                                        <td>${expense.cheminJustificatif ? 'Oui' : 'Non'}</td>
                                    </tr>
                                `).join('');
                            } else {
                                return `
                                    <tr>
                                        <td>${day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                    </tr>
                                `;
                            }
                        }).join('')}
                    </tbody>
                </table>
            `).join('');
        };

        const generateDistanceTableInChunks = (daysInMonth, trips) => {
            const chunks = createTableChunks(daysInMonth, 20);
            return chunks.map((chunk, index) => `
                ${index > 0 ? '<div class="page-break"></div>' : ''}
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Lieu de deplacement</th>
                            <th>Distance (Km)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${chunk.map(day => {
                            const trip = trips.find(t => new Date(t.date).toDateString() === day.toDateString());
                            const distance = trip ? parseFloat(trip.distanceKm) || 0 : 0;
                            return `
                                <tr>
                                    <td>${day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                    <td>${trip ? trip.chantier?.designation || 'N/A' : ''}</td>
                                    <td>${distance.toFixed(2)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `).join('');
        };

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Note de frais ${label}</title>
            <style>
                @page {
                    size: A4 landscape;
                    margin: 0.4in 0.5in;
                    @top-left { content: ""; }
                    @top-center { content: ""; }
                    @top-right { content: ""; }
                    @bottom-left { content: ""; }
                    @bottom-center { content: ""; }
                    @bottom-right { content: ""; }
                }
                body {
                    font-family: "Calibri", Arial, sans-serif;
                    font-size: 11px;
                    margin: 0;
                    padding: 15px;
                    background: white;
                    color: black;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                .header h1 {
                    font-size: 18px;
                    color: #4F81BD;
                    margin: 0;
                }
                .header .user-info {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 10px 0;
                }
                .section-title {
                    font-size: 14px;
                    font-weight: bold;
                    background-color: #E0E0E0;
                    padding: 8px;
                    margin: 20px 0 10px 0;
                    border: 1px solid #000;
                    page-break-after: avoid;
                    page-break-inside: avoid;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                }
                thead {
                    display: table-header-group;
                    page-break-inside: avoid;
                }
                tbody {
                    display: table-row-group;
                }
                tr {
                    page-break-inside: avoid;
                }
                .total-row {
                    page-break-inside: avoid;
                    page-break-before: avoid;
                }
                tr:nth-child(-n+3) {
                    page-break-after: avoid;
                }
                th, td {
                    border: 1px solid #000;
                    padding: 6px;
                    text-align: center;
                    font-size: 10px;
                }
                th {
                    background-color: #4F81BD;
                    color: white;
                    font-weight: bold;
                }
                .text-left {
                    text-align: left;
                }
                .text-right {
                    text-align: right;
                }
                .text-center {
                    text-align: center;
                }
                .bold {
                    font-weight: bold;
                }
                .total-row {
                    background-color: #D3D3D3;
                    font-weight: bold;
                }
                .currency::after {
                    content: " MAD";
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    .section-title {
                        page-break-after: avoid;
                    }
                    .section-title + table {
                        page-break-before: avoid;
                    }
                    thead {
                        page-break-after: avoid;
                    }
                    .no-print {
                        display: none !important;
                    }
                    table {
                        page-break-inside: auto;
                    }
                    thead {
                        display: table-header-group;
                    }
                    tbody {
                        display: table-row-group;
                    }
                    .section-title:not(:first-of-type) {
                        margin-top: 30px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="user-info">Nom et Prénom : ${fullName}</div>
                <h1>Note de frais – ${label}</h1>
            </div>

            <!-- Section 1: Detailed Trips -->
            <div class="section-title">DÉTAIL DES TRAJETS</div>
            ${generateTripsTableInChunks(daysInMonth, trips, travelTypeNames, travelTypes)}

            <!-- Summary Table -->
            <table>
                <tbody>
                    <tr class="bold">
                        <td colspan="3">Nombre de jours</td>
                        ${travelTypeNames.map(typeName => {
                            const count = trips.filter(trip => {
                                const travelType = travelTypes.find(t => t.id === trip.typeDeDeplacementId);
                                return travelType && travelType.nom === typeName;
                            }).length;
                            return `<td>${count}</td>`;
                        }).join('')}
                    </tr>
                    <tr class="bold">
                        <td colspan="3">Taux de mission</td>
                        ${travelTypeNames.map(typeName => {
                            const travelType = travelTypes.find(t => t.nom === typeName);
                            const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === travelType?.id);
                            const rate = missionRate ? parseFloat(missionRate.tarifParJour) : 0;
                            return `<td class="currency">${rate.toFixed(2)}</td>`;
                        }).join('')}
                    </tr>
                    <tr class="bold">
                        <td colspan="3">Total</td>
                        ${travelTypeNames.map(typeName => {
                            const travelType = travelTypes.find(t => t.nom === typeName);
                            const count = trips.filter(trip => {
                                const tripType = travelTypes.find(t => t.id === trip.typeDeDeplacementId);
                                return tripType && tripType.nom === typeName;
                            }).length;
                            const missionRate = roleMissionRates.find(rate => rate.typeDeDeplacementId === travelType?.id);
                            const rate = missionRate ? parseFloat(missionRate.tarifParJour) : 0;
                            const total = count * rate;
                            return `<td class="currency">${total.toFixed(2)}</td>`;
                        }).join('')}
                    </tr>
                    <tr class="bold">
                        <td colspan="3">Total General</td>
                        <td colspan="${travelTypeNames.length}" class="currency text-center">${grandTotalTrips.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Section 2: Miscellaneous Expenses -->
            <div class="section-title">DÉPENSES DIVERSES</div>
            ${generateMiscExpensesTableInChunks(daysInMonth, trips)}

            <!-- Total for miscellaneous expenses -->
            <table>
                <tbody>
                    <tr class="bold total-row">
                        <td colspan="2" class="text-left">Total</td>
                        <td class="currency">${totals.totalMisc.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <!-- Section 3: Distance Table -->
            <div class="section-title">DISTANCES PARCOURUES</div>
            ${generateDistanceTableInChunks(daysInMonth, trips)}

            <!-- Distance summary table -->
            <table>
                <tbody>
                    <tr class="bold total-row">
                        <td colspan="2" class="text-left">Total</td>
                        <td>${totalDistance.toFixed(2)}</td>
                    </tr>
                    ${
                        totals.mileageCosts.size > 1
                        ? Array.from(totals.mileageCosts.entries()).map(
                            ([libelle, { rate, distance }]) => `
                                <tr class="bold">
                                    <td colspan="2" class="text-left">Taux (${libelle})</td>
                                    <td class="currency">${rate.toFixed(2)} - ${distance.toFixed(2)} Km</td>
                                </tr>
                            `
                            ).join('')
                        : `<tr class="bold">
                            <td colspan="2" class="text-left">Taux</td>
                            <td class="currency">
                                ${
                                    totals.mileageCosts.size > 0
                                    ? Array.from(totals.mileageCosts.values())[0].rate.toFixed(2)
                                    : '0.00'
                                }
                            </td>
                        </tr>`
                    }
                    <tr class="bold total-row">
                        <td colspan="2" class="text-left">Net à payer</td>
                        <td class="currency">
                            ${
                                totals.mileageCosts.size > 0
                                ? Array.from(totals.mileageCosts.values())
                                    .reduce((sum, { total }) => sum + total, 0)
                                    .toFixed(2)
                                : '0.00'
                            }
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Section 4: Récapitulatif -->
            <div class="section-title">RÉCAPITULATIF</div>
            <table>
                <thead>
                    <tr>
                        <th>Désignation</th>
                        <th>Chantier</th>
                        <th>Quantité</th>
                        <th>Taux / J</th>
                        <th>Montant</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="text-left">Feuille de depens</td>
                        <td></td>
                        <td>${totals.miscCount}</td>
                        <td>-</td>
                        <td class="currency">${totals.totalMisc.toFixed(2)}</td>
                    </tr>
                    ${Array.from(totals.dailyAllowances.entries()).map(([rate, { count, total, name }]) => `
                        <tr>
                            <td class="text-left">Frais journaliers (${name})</td>
                            <td></td>
                            <td>${count}</td>
                            <td class="currency">${rate.toFixed(2)}</td>
                            <td class="currency">${total.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    ${Array.from(totals.mileageCosts.entries()).map(([libelle, { distance, total, rate, conditionType, threshold, rateAfter }]) => {
                        const rateDisplay = (conditionType === "THRESHOLD" && threshold && rateAfter !== rate)
                            ? `${rate.toFixed(2)}/${rateAfter.toFixed(2)} (seuil: ${threshold}km)`
                            : rate.toFixed(2);
                        return `
                            <tr>
                                <td class="text-left">Frais kilométrique (${libelle})</td>
                                <td></td>
                                <td>${distance.toFixed(2)} Km</td>
                                <td>${rateDisplay}</td>
                                <td class="currency">${total.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('')}
                    <tr class="bold total-row">
                        <td colspan="4" class="text-left">Total Dépense</td>
                        <td class="currency">${totals.grandTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    document.title = "Note de frais ${label}";
                    setTimeout(() => {
                        window.print();
                        window.onafterprint = function() {
                            setTimeout(() => {
                                window.close();
                            }, 1000);
                        };
                    }, 500);
                };
            </script>
        </body>
        </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank', 'width=1200,height=800');
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 5000);
        if (printWindow) {
            printWindow.focus();
        }
    } catch (err) {
        console.error("❌ handleExcelPrintClean failed:", err);
        alert('Une erreur est survenue lors de la génération du document pour impression.');
    }
};