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
 * @returns {string} The month label in the format "MonthName Year" (e.g. "F vrier 2022").
 */
export const getMonthLabel = (year, month) => {
  return new Date(year, month).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
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

  // --- 1. Reuse your totals calculation from PDF export ---
  const calculateTotals = () => {
    const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;
    const dailyAllowances = new Map();
    const mileageCosts = new Map();
    let totalMisc = 0, miscCount = 0;

    trips.forEach(trip => {
      // misc expenses
      if (Array.isArray(trip.depenses)) {
        miscCount += trip.depenses.length;
        trip.depenses.forEach(e => totalMisc += parseFloat(e.montant)||0);
      }
      
      // mileage - Fixed to match hook logic
      const dist = parseFloat(trip.distanceKm)||0;
      if (trip.tauxKilometriqueRoleId && dist > 0) {
        // Look for the rate in userCarLoans.rates array (matching hook logic)
        const kilometerRate = userCarLoans.rates?.find(rate => rate.id === trip.tauxKilometriqueRoleId);
        if (kilometerRate) {
          const rate = parseFloat(kilometerRate.tarifParKm)||0;
          const cost = dist * rate;
          // Use the rate's libelle or a default key
          const key = kilometerRate.libelle || '(Véhicule non spécifié)';
          if (!mileageCosts.has(key)) mileageCosts.set(key, { distance:0, total:0, rate });
          const cur = mileageCosts.get(key);
          cur.distance += dist;
          cur.total += cost;
        }
      }
      
      // daily allowances
      const mr = userMissionRates.find(r=>r.typeDeDeplacementId===trip.typeDeDeplacementId);
      if (mr) {
        const rate = parseFloat(mr.tarifParJour)||0;
        const name = travelTypes.find(t=>t.id===trip.typeDeDeplacementId)?.nom || 'Inconnu';
        if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count:0, total:0, name });
        const cur = dailyAllowances.get(rate);
        cur.count++;
        cur.total += rate;
      }
    });

    let grand = totalMisc;
    mileageCosts.forEach(v=>grand+=v.total);
    dailyAllowances.forEach(v=>grand+=v.total);

    return { totalMisc, miscCount, mileageCosts, dailyAllowances, grand };
  };

  const totals = calculateTotals();
  const { fullName = '' } = dashboardData.userInfo || {};

  // --- 2. Build workbook & worksheet ---
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(label);

  // (a) header image
  const imgId = wb.addImage({
    base64: logo,
    extension: 'png',
  });
  ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
  ws.mergeCells('D1:E2');
  ws.getCell('D1').value = `Nom et Prénom : ${fullName}`;
  ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getCell('D1').font = { size: 12 };

  // (b) title
  ws.mergeCells('A4:E4');
  ws.getCell('A4').value = `Note de frais – ${label}`;
  ws.getCell('A4').font = { size: 16, bold: true };
  ws.getCell('A4').alignment = { horizontal: 'center' };

  // (c) table header
  const headerRow = ws.addRow(['Désignation','Chantier','Quantité','Taux / J','Montant']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern', pattern:'solid', fgColor:{ argb:'FFF0F0F0' }
    };
    cell.border = {
      top: {style:'thin'}, left:{style:'thin'},
      bottom:{style:'thin'}, right:{style:'thin'}
    };
    cell.alignment = { vertical:'middle', horizontal:'center' };
  });

  // (d) misc expenses row
  ws.addRow([
    'Feuille de depens','',
    totals.miscCount,
    '-',
    totals.totalMisc.toFixed(2)
  ]).alignment = { horizontal:'right' };

  // (e) daily allowances
  totals.dailyAllowances.forEach(({ count, total, name }, rate) => {
    ws.addRow([
      `Frais journaliers (${name})`,
      '',
      count,
      rate.toFixed(2),
      total.toFixed(2)
    ]).alignment = { horizontal:'right' };
  });

  // (f) mileage
  totals.mileageCosts.forEach(({ distance, total, rate }, libelle) => {
    ws.addRow([
      `Frais kilométrique (${libelle})`,
      '',
      `${distance.toFixed(2)} Km`,
      rate.toFixed(2),
      total.toFixed(2)
    ]).alignment = { horizontal:'right' };
  });

  // (g) grand total
  const totalRow = ws.addRow(['Total Dépense','','','','',]);
  ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
  const lastCell = ws.getCell(`E${totalRow.number}`);
  lastCell.value = totals.grand.toFixed(2);
  lastCell.font = { bold: true };
  lastCell.fill = { type:'pattern',pattern:'solid',fgColor:{argb:'FFF0F0F0'} };
  lastCell.alignment = { horizontal:'right' };

  // auto‑width
  ws.columns.forEach(c=>{
    let max = 10;
    c.eachCell(cell => {
      const len = (cell.value||'').toString().length;
      if (len>max) max = len;
    });
    c.width = max + 2;
  });

  // --- 3. Write & download ---
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf]), `Note_de_frais_${fullName}_${year}_${month+1}.xlsx`);
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

  // Calculate totals from dashboard data
  const calculateTotals = () => {
    const { trips, userMissionRates, userCarLoans, travelTypes } = dashboardData;

    // Use Maps to dynamically group expenses
    const dailyAllowances = new Map();
    const mileageCosts = new Map(); // Key will be the rate's libelle
    let totalMiscExpenses = 0;
    let miscExpensesCount = 0; // Counter for the number of expenses

    trips.forEach(trip => {
      // 1. Sum miscellaneous expenses and count them
      if (trip.depenses && Array.isArray(trip.depenses)) {
        miscExpensesCount += trip.depenses.length;
        trip.depenses.forEach(expense => {
          totalMiscExpenses += parseFloat(expense.montant) || 0;
        });
      }

      // 2. Group Mileage Costs by rate libelle - Fixed to match hook logic
      const distance = parseFloat(trip.distanceKm) || 0;
      if (trip.tauxKilometriqueRoleId && distance > 0) {
        // Look for the rate in userCarLoans.rates array (matching hook logic)
        const kilometerRate = userCarLoans.rates?.find(rate => rate.id === trip.tauxKilometriqueRoleId);
        if (kilometerRate) {
          const rate = parseFloat(kilometerRate.tarifParKm) || 0;
          const cost = distance * rate;
          // Use the rate's libelle as the key to group different vehicle types
          const libelle = kilometerRate.libelle || '(Véhicule non spécifié)';

          if (!mileageCosts.has(libelle)) {
            mileageCosts.set(libelle, { distance: 0, total: 0, rate: rate });
          }
          const current = mileageCosts.get(libelle);
          current.distance += distance;
          current.total += cost;
        }
      }

      // 3. Group Daily Allowances by their rate
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
          { text: totals.miscExpensesCount, alignment: 'right' }, // Display number of expenses
          '-', 
          { text: totals.totalMiscExpenses.toFixed(2), alignment: 'right' }
      ]
  ];

  // Add a row for each unique daily allowance rate
  totals.dailyAllowances.forEach((data, rate) => {
      tableBody.push([
          `Frais journaliers (${data.name})`, // Prepend text as requested
          '',
          { text: `${data.count}`, alignment: 'right' },
          { text: rate.toFixed(2), alignment: 'right' },
          { text: data.total.toFixed(2), alignment: 'right' }
      ]);
  });

  // Add a row for each unique mileage category (based on rate libelle)
  totals.mileageCosts.forEach((data, libelle) => {
      tableBody.push([
          `Frais kilométrique (${libelle})`, // Dynamically add libelle
          '',
          { text: `${data.distance.toFixed(2)} Km`, alignment: 'right' },
          { text: data.rate.toFixed(2), alignment: 'right' },
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