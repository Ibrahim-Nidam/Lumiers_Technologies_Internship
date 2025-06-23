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

/**
* Helper function to calculate distance costs with threshold logic for export
*/
const calculateDistanceCostsForExport = (trips, userCarLoans) => {
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
* Generic function to style header cells in ExcelJS.
* @param {ExcelJS.Cell} cell - The cell to style.
*/
const styleHeaderCell = (cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' } // A nice blue color
    };
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
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
        column.width = maxTextLength < 10 ? 12 : maxTextLength + 4;
    });
};


/**
* Export the specified user's data for the current month as an Excel file.
*
* @param {number} year - The year to export (e.g. 2022).
* @param {number} month - The month to export (0-11, where 0 = January).
* @param {Object} dashboardData - The dashboard data to export.
*
* @returns {Promise<void>}
*/
export const handleExcelExport = async (year, month, dashboardData) => {
 const label = getMonthLabel(year, month);
  const { trips, userMissionRates, userCarLoans, travelTypes, userInfo } = dashboardData;
  const { fullName = 'N/A' } = userInfo || {};

 // Build workbook
 const wb = new ExcelJS.Workbook();
  
  // --- START: Detailed Trips Sheet ---
  const wsTrips = wb.addWorksheet('Détail des Trajets');
  wsTrips.addRow([`Détail des Trajets pour ${fullName} - ${label}`]).font = { size: 16, bold: true };
  wsTrips.mergeCells('A1:D1');
  wsTrips.getCell('A1').alignment = { horizontal: 'center' };
  wsTrips.addRow([]); // Spacer

  const tripsHeader = wsTrips.addRow(['Date', 'Chantier', 'Distance (Km)', 'Type de Déplacement']);
  tripsHeader.eachCell(styleHeaderCell);

  trips.forEach(trip => {
      const travelType = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'N/A';
      wsTrips.addRow([
          new Date(trip.date).toLocaleDateString('fr-FR'),
          // Correctly access the designation from the chantier object
          trip.chantier?.designation || 'N/A',
          parseFloat(trip.distanceKm) || 0,
          travelType,
      ]);
  });
  autoWidthColumns(wsTrips);
  // --- END: Detailed Trips Sheet ---

  // --- START: Miscellaneous Expenses Sheet ---
  const wsExpenses = wb.addWorksheet('Dépenses Diverses');
  wsExpenses.addRow([`Dépenses Diverses pour ${fullName} - ${label}`]).font = { size: 16, bold: true };
  wsExpenses.mergeCells('A1:C1');
  wsExpenses.getCell('A1').alignment = { horizontal: 'center' };
  wsExpenses.addRow([]); // Spacer

  const expensesHeader = wsExpenses.addRow(['Date du Trajet', 'Montant (MAD)', 'Justificatif']);
  expensesHeader.eachCell(styleHeaderCell);
  
  let totalMisc = 0;
  trips.forEach(trip => {
      if (trip.depenses && trip.depenses.length > 0) {
          trip.depenses.forEach(expense => {
              const amount = parseFloat(expense.montant) || 0;
              const expenseRow = wsExpenses.addRow([
                  new Date(trip.date).toLocaleDateString('fr-FR'),
                  amount,
                  // CORRECTED: Check for 'cheminJustificatif' property existence and truthiness
                  expense.cheminJustificatif ? 'Oui' : 'Non'
              ]);
              // Correctly format the currency cell
              expenseRow.getCell(2).numFmt = '#,##0.00 "MAD"';
              totalMisc += amount;
          });
      }
  });
  // Add total for misc expenses
  const totalExpensesRow = wsExpenses.addRow(['Total', totalMisc, '']);
  totalExpensesRow.getCell(1).font = { bold: true };
  const totalExpensesCell = totalExpensesRow.getCell(2);
  totalExpensesCell.font = { bold: true };
  totalExpensesCell.numFmt = '#,##0.00 "MAD"';

  autoWidthColumns(wsExpenses);
  // --- END: Miscellaneous Expenses Sheet ---


 // --- START: Recap Sheet ---
 const calculateTotals = () => {
  const dailyAllowances = new Map();
  let miscCount = 0;

  trips.forEach(trip => {
   if (Array.isArray(trip.depenses)) {
    miscCount += trip.depenses.length;
   }

   const mr = userMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
   if (mr) {
    const rate = parseFloat(mr.tarifParJour) || 0;
    const name = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'Inconnu';
    if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count: 0, total: 0, name });
    const cur = dailyAllowances.get(rate);
    cur.count++;
    cur.total += rate;
   }
  });

  const mileageCosts = calculateDistanceCostsForExport(trips, userCarLoans);

  let grand = totalMisc;
  mileageCosts.forEach(v => grand += v.total);
  dailyAllowances.forEach(v => grand += v.total);

  return { totalMisc, miscCount, mileageCosts, dailyAllowances, grand };
 };

 const totals = calculateTotals();
  
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
  headerRowRecap.eachCell(styleHeaderCell);

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

 // Mileage costs
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
 const totalRowRecap = wsRecap.addRow(['Total Dépense', '', '', '', totals.grand]);
 wsRecap.mergeCells(`A${totalRowRecap.number}:D${totalRowRecap.number}`);
  const totalLabelCell = wsRecap.getCell(`A${totalRowRecap.number}`);
  totalLabelCell.font = { bold: true, size: 12 };
  totalLabelCell.alignment = { horizontal: 'right' };

 const grandTotalCell = wsRecap.getCell(`E${totalRowRecap.number}`);
 grandTotalCell.numFmt = '#,##0.00 "MAD"';
 grandTotalCell.font = { bold: true, size: 12 };
 grandTotalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } }; // Light grey
 grandTotalCell.alignment = { horizontal: 'right' };

 autoWidthColumns(wsRecap);
  // --- END: Recap Sheet ---

 // Write & download
 const buf = await wb.xlsx.writeBuffer();
 saveAs(new Blob([buf]), `Note_de_frais_${fullName}_${year}_${month + 1}.xlsx`);
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

 // Initialize pdfmake correctly
 pdfMake.vfs = pdfFonts.vfs;
 pdfMake.fonts = {
  Roboto: {
   normal: 'Roboto-Regular.ttf',
   bold: 'Roboto-Medium.ttf',
   italics: 'Roboto-Italic.ttf',
   bolditalics: 'Roboto-MediumItalic.ttf'
  }
 };

 // Calculate totals from dashboard data using updated logic
 const calculateTotals = () => {
  const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;

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

  // Calculate distance costs using the updated logic
  const mileageCosts = calculateDistanceCostsForExport(trips, userCarLoans);

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
 const userInfo = dashboardData.userInfo || {};

 // Dynamically build the table body
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
