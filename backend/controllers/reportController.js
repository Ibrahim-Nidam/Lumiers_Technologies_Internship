// controllers/reportController.js

const { Op } = require('sequelize');
const {
  User, Deplacement, Depense,
  TauxMissionUtilisateur, CarLoan, TypeDeDeplacement
} = require('../models');
const ExcelJS   = require('exceljs');
const pdfMake   = require('pdfmake/build/pdfmake');
const pdfFonts  = require('pdfmake/build/vfs_fonts');
pdfMake.vfs     = pdfFonts;          // embed default fonts
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

  const userInfo         = await User.findByPk(userId);
  const trips            = await Deplacement.findAll({
    where: { userId, date: { [Op.between]: [start, end] } },
    include: [{ model: Depense, as: 'depenses' }]
  });
  const userMissionRates = await TauxMissionUtilisateur.findAll({ where: { userId } });
  const userCarLoans     = await CarLoan.findAll({ where: { userId } });
  const travelTypes      = await TypeDeDeplacement.findAll();

  return { userInfo, trips, userMissionRates, userCarLoans, travelTypes };
}

/**
 * Pure helper: generate Excel file on disk, return its path.
 */
exports.generateExcelReport = async (userId, year, month) => {
  try {
    const { userInfo, trips, userMissionRates, userCarLoans, travelTypes } =
      await getDashboardData(userId, year, month);
    const label    = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // 1) calculateTotals
    const dailyAllowances = new Map();
    const mileageCosts    = new Map();
    let totalMisc = 0, miscCount = 0;

    trips.forEach(trip => {
      if (Array.isArray(trip.depenses)) {
        miscCount += trip.depenses.length;
        trip.depenses.forEach(e => totalMisc += parseFloat(e.montant) || 0);
      }
      const dist = parseFloat(trip.distanceKm) || 0;
      if (trip.carLoanId && dist > 0) {
        const loan = userCarLoans.find(l => l.id === trip.carLoanId);
        if (loan) {
          const rate = parseFloat(loan.tarifParKm) || 0;
          const cost = dist * rate;
          const key  = loan.libelle || '(Véhicule non spécifié)';
          if (!mileageCosts.has(key)) mileageCosts.set(key, { distance: 0, total: 0, rate });
          const cur = mileageCosts.get(key);
          cur.distance += dist; cur.total += cost;
        }
      }
      const mr = userMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      if (mr) {
        const rate = parseFloat(mr.tarifParJour) || 0;
        const name = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'Inconnu';
        if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count: 0, total: 0, name });
        const cur = dailyAllowances.get(rate);
        cur.count++; cur.total += rate;
      }
    });

    let grand = totalMisc;
    mileageCosts.forEach(v => grand += v.total);
    dailyAllowances.forEach(v => grand += v.total);

    // 2) build Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(label);

    // header image + name
    const imgId = wb.addImage({ base64: logo, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 60 } });
    ws.mergeCells('D1:E2');
    ws.getCell('D1').value     = `Nom et Prénom : ${fullName}`;
    ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('D1').font      = { size: 12 };

    // title
    ws.mergeCells('A4:E4');
    ws.getCell('A4').value     = `Note de frais – ${label}`;
    ws.getCell('A4').font      = { size: 16, bold: true };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    // table header
    const headerRow = ws.addRow(['Désignation','Chantier','Quantité','Taux / J','Montant']);
    headerRow.eachCell(cell => {
      cell.font      = { bold: true };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      cell.border    = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // misc expenses
    ws.addRow(['Feuille de depens','', miscCount, '-', totalMisc.toFixed(2)])
      .alignment = { horizontal: 'right' };

    // daily allowances
    dailyAllowances.forEach(({ count, total, name }, rate) => {
      ws.addRow([
        `Frais journaliers (${name})`, '',
        count, rate.toFixed(2), total.toFixed(2)
      ]).alignment = { horizontal: 'right' };
    });

    // mileage
    mileageCosts.forEach(({ distance, total, rate }, libelle) => {
      ws.addRow([
        `Frais kilométrique (${libelle})`, '',
        `${distance.toFixed(2)} Km`,
        rate.toFixed(2),
        total.toFixed(2)
      ]).alignment = { horizontal: 'right' };
    });

    // grand total
    const totalRow = ws.addRow(['Total Dépense','','','','']);
    ws.mergeCells(`A${totalRow.number}:D${totalRow.number}`);
    ws.getCell(`E${totalRow.number}`).value     = grand.toFixed(2);
    ws.getCell(`E${totalRow.number}`).font      = { bold: true };
    ws.getCell(`E${totalRow.number}`).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
    ws.getCell(`E${totalRow.number}`).alignment = { horizontal: 'right' };

    // auto‑width
    ws.columns.forEach(c => {
      let max = 10;
      c.eachCell(cell => {
        const len = (cell.value||'').toString().length;
        if (len > max) max = len;
      });
      c.width = max + 2;
    });

    // write to tmp and return path
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
 * Pure helper: generate PDF file on disk, return its path.
 */
exports.generatePDFReport = async (userId, year, month) => {
  try {
    const { userInfo, trips, userMissionRates, userCarLoans, travelTypes } =
      await getDashboardData(userId, year, month);
    const label    = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // calculateTotals
    let totalMiscExpenses = 0, miscExpensesCount = 0;
    const mileageCosts   = new Map();
    const dailyAllowances= new Map();

    trips.forEach(trip => {
      if (Array.isArray(trip.depenses)) {
        miscExpensesCount += trip.depenses.length;
        trip.depenses.forEach(e => totalMiscExpenses += parseFloat(e.montant) || 0);
      }
      const dist = parseFloat(trip.distanceKm) || 0;
      if (trip.carLoanId && dist > 0) {
        const loan = userCarLoans.find(l => l.id === trip.carLoanId);
        if (loan) {
          const rate = parseFloat(loan.tarifParKm) || 0;
          const cost = dist * rate;
          const libelle = loan.libelle || '(Véhicule non spécifié)';
          if (!mileageCosts.has(libelle)) mileageCosts.set(libelle, { distance: 0, total: 0, rate });
          const cur = mileageCosts.get(libelle);
          cur.distance += dist; cur.total += cost;
        }
      }
      const mr = userMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      if (mr) {
        const rate = parseFloat(mr.tarifParJour) || 0;
        const name = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'Inconnu';
        if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count: 0, total: 0, name });
        const cur = dailyAllowances.get(rate);
        cur.count++; cur.total += rate;
      }
    });

    let grandTotal = totalMiscExpenses;
    mileageCosts.forEach(v => grandTotal += v.total);
    dailyAllowances.forEach(v => grandTotal += v.total);

    // build tableBody
    const tableBody = [
      [
        { text: 'Désignation', bold: true, fillColor: '#f0f0f0' },
        { text: 'Chantier',    bold: true, fillColor: '#f0f0f0' },
        { text: 'Quantité',    bold: true, fillColor: '#f0f0f0' },
        { text: 'Taux / J',    bold: true, fillColor: '#f0f0f0' },
        { text: 'Montant',     bold: true, fillColor: '#f0f0f0' }
      ],
      [
        'Feuille de depens','',
        { text: miscExpensesCount, alignment: 'right' },
        '-',
        { text: totalMiscExpenses.toFixed(2), alignment: 'right' }
      ]
    ];

    dailyAllowances.forEach(({ count, total, name }, rate) => {
      tableBody.push([
        `Frais journaliers (${name})`, '',
        { text: count, alignment: 'right' },
        { text: rate.toFixed(2), alignment: 'right' },
        { text: total.toFixed(2), alignment: 'right' }
      ]);
    });

    mileageCosts.forEach(({ distance, total, rate }, libelle) => {
      tableBody.push([
        `Frais kilométrique (${libelle})`, '',
        { text: `${distance.toFixed(2)} Km`, alignment: 'right' },
        { text: rate.toFixed(2), alignment: 'right' },
        { text: total.toFixed(2), alignment: 'right' }
      ]);
    });

    tableBody.push([
      { text: 'Total Dépense', colSpan: 4, alignment: 'right', bold: true, fillColor: '#f0f0f0' },
      {}, {}, {},
      { text: grandTotal.toFixed(2), bold: true, alignment: 'right', fillColor: '#f0f0f0' }
    ]);

    // docDefinition
    const docDef = {
      content: [
        {
          columns: [
            { image: logo, width: 100, height: 50 },
            { text: `Nom et Prénom : ${fullName}`, style: 'userInfo', alignment: 'right' }
          ],
          margin: [0, 0, 0, 20]
        },
        { text: `Note de frais - ${label}`, style: 'header' },
        {
          table: {
            widths: ['*','auto','auto','auto','auto'],
            body: tableBody
          },
          layout: {
            hLineWidth: (i,n) => (i===0||i===n.table.body.length)?2:1,
            vLineWidth: (i,n) => (i===0||i===n.table.widths.length)?2:1,
            hLineColor: (i,n) => (i===0||i===n.table.body.length)?'black':'gray',
            vLineColor: (i,n) => (i===0||i===n.table.widths.length)?'black':'gray'
          }
        },
        { text: '\n\n\n' },
        {
          table: {
            widths: ['50%','50%'],
            body: [
              [
                { text:'Signature de l\'intéressé', alignment:'center', border:[true,true,true,false] },
                { text:'Signature du responsable',   alignment:'center', border:[true,true,true,false] }
              ],
              [
                { text:'', margin:[0,40,0,0], border:[true,false,true,true] },
                { text:'', margin:[0,40,0,0], border:[true,false,true,true] }
              ]
            ]
          },
          layout:'noBorders'
        }
      ],
      styles: {
        header:   { fontSize:16, bold:true, alignment:'center', margin:[0,0,0,20] },
        userInfo: { fontSize:12, alignment:'right' }
      },
      defaultStyle: { fontSize:10 }
    };

    // write PDF buffer
    const tmpDir = path.join(__dirname, '../tmp');
    await fs.ensureDir(tmpDir);
    const outPath = path.join(tmpDir, `report-${userId}-${year}-${month+1}.pdf`);

    const pdfDoc = pdfMake.createPdf(docDef);
    await new Promise((resolve, reject) => {
      pdfDoc.getBuffer(buffer => {
        fs.writeFile(outPath, buffer, err => err ? reject(err) : resolve());
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
