const { Op } = require('sequelize');
const {
  User, Deplacement, Depense, Role,
  TauxMissionRole, TauxKilometriqueRole, TypeDeDeplacement
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

  const userInfo = await User.findByPk(userId, {
    include: [{ model: Role, as: 'role' }]
  });
  
  const trips = await Deplacement.findAll({
    where: { userId, date: { [Op.between]: [start, end] } },
    include: [{ model: Depense, as: 'depenses' }]
  });

  // Get rates based on user's role
  const roleMissionRates = await TauxMissionRole.findAll({ 
    where: { roleId: userInfo.roleId } 
  });
  
  const roleKilometricRates = await TauxKilometriqueRole.findAll({ 
    where: { roleId: userInfo.roleId } 
  });
  
  const travelTypes = await TypeDeDeplacement.findAll();

  return { userInfo, trips, roleMissionRates, roleKilometricRates, travelTypes };
}

function getTotalExpenses(depenses) {
  return depenses.reduce((sum, expense) => sum + (parseFloat(expense.montant) || 0), 0);
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
      const [trips, roleMissionRates, roleKilometricRates] = await Promise.all([
        Deplacement.findAll({
          where: {
            userId: user.id,
            date: { [Op.between]: [startDate, endDate] }
          },
          include: [
            { model: Depense, as: 'depenses' },
            { model: TypeDeDeplacement, as: 'typeDeDeplacement' }
          ]
        }),
        TauxMissionRole.findAll({ where: { roleId: user.roleId } }),
        TauxKilometriqueRole.findAll({ where: { roleId: user.roleId } })
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

        // Add kilometric cost based on role rates
        if (trip.distanceKm) {
          // For now, use the first kilometric rate found for the role
          // You might want to implement logic to choose the appropriate rate
          const roleKilometricRate = roleKilometricRates[0];
          if (roleKilometricRate) {
            const distanceCost = (parseFloat(trip.distanceKm) || 0) * (parseFloat(roleKilometricRate.tarifParKm) || 0);
            tripTotal += distanceCost;
          }
        }

        userData.grandTotal += tripTotal;
      }

      // Prepare row data
      const rowData = { ...userData };

      // Add type-specific data to row
      travelTypes.forEach(type => {
        rowData[`days_${type.id}`] = typeDays[type.id];
        // Only show rate if there are days for this type
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
        const [deplacements, roleMissionRates, roleKilometricRates] = await Promise.all([
          Deplacement.findAll({
            where: {
              userId: user.id,
              date: { [Op.between]: [startDate, endDate] }
            },
            include: [{ model: Depense, as: "depenses" }]
          }),
          TauxMissionRole.findAll({ where: { roleId: user.roleId } }),
          TauxKilometriqueRole.findAll({ where: { roleId: user.roleId } })
        ]);

        let totalDistance = 0;
        let totalExpenses = 0;
        let justified = 0;
        let unjustified = 0;

        // 🔁 For each trip
        for (const trip of deplacements) {
          totalDistance += parseFloat(trip.distanceKm) || 0;

          // ✅ Total cost = expenses + mission rate + kilometric cost
          const expensesTotal = getTotalExpenses(trip.depenses);

          const travelTypeRate = roleMissionRates.find(
            rate => rate.typeDeDeplacementId === trip.typeDeDeplacementId
          );
          const travelTypeAmount = travelTypeRate ? parseFloat(travelTypeRate.tarifParJour) || 0 : 0;

          let distanceCost = 0;
          if (trip.distanceKm) {
            // Use the first available kilometric rate for the role
            // You might want to implement logic to choose the appropriate rate based on some criteria
            const roleKilometricRate = roleKilometricRates[0];
            if (roleKilometricRate) {
              distanceCost = (parseFloat(trip.distanceKm) || 0) * (parseFloat(roleKilometricRate.tarifParKm) || 0);
            }
          }

          totalExpenses += expensesTotal + travelTypeAmount + distanceCost;

          // 📦 Justification count
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
 * Pure helper: generate Excel file on disk, return its path.
 */
exports.generateExcelReport = async (userId, year, month) => {
  try {
    const { userInfo, trips, roleMissionRates, roleKilometricRates, travelTypes } =
      await getDashboardData(userId, year, month);
    const label = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // 1) calculateTotals
    const dailyAllowances = new Map();
    const mileageCosts = new Map();
    let totalMisc = 0, miscCount = 0;

    trips.forEach(trip => {
      if (Array.isArray(trip.depenses)) {
    miscCount += trip.depenses.length;
    trip.depenses.forEach(e => totalMisc += parseFloat(e.montant) || 0);
  }
  
  const dist = parseFloat(trip.distanceKm) || 0;
  if (dist > 0) {
    const roleKilometricRate = roleKilometricRates[0];
    if (roleKilometricRate) {
      const rate = parseFloat(roleKilometricRate.tarifParKm) || 0;
      const cost = dist * rate;
      const key = roleKilometricRate.libelle || '(Véhicule non spécifié)';
      // Log each trip's details
      console.log(`Trip ID: ${trip.id || 'unknown'}, Distance: ${dist}, Rate Label: ${key}, Rate Value: ${rate}, Cost: ${cost}`);
      if (!mileageCosts.has(key)) mileageCosts.set(key, { distance: 0, total: 0, rate });
      const cur = mileageCosts.get(key);
      cur.distance += dist; 
      cur.total += cost;
    }
  }
      
      const mr = roleMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      if (mr) {
        const rate = parseFloat(mr.tarifParJour) || 0;
        const name = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'Inconnu';
        if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count: 0, total: 0, name });
        const cur = dailyAllowances.get(rate);
        cur.count++; 
        cur.total += rate;
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
    ws.getCell('D1').value = `Nom et Prénom : ${fullName}`;
    ws.getCell('D1').alignment = { horizontal: 'right', vertical: 'middle' };
    ws.getCell('D1').font = { size: 12 };

    // title
    ws.mergeCells('A4:E4');
    ws.getCell('A4').value = `Note de frais – ${label}`;
    ws.getCell('A4').font = { size: 16, bold: true };
    ws.getCell('A4').alignment = { horizontal: 'center' };

    // table header
    const headerRow = ws.addRow(['Désignation','Chantier','Quantité','Taux / J','Montant']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
      cell.border = {
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
    ws.getCell(`E${totalRow.number}`).value = grand.toFixed(2);
    ws.getCell(`E${totalRow.number}`).font = { bold: true };
    ws.getCell(`E${totalRow.number}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } };
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
    const { userInfo, trips, roleMissionRates, roleKilometricRates, travelTypes } =
      await getDashboardData(userId, year, month);
    const label = getMonthLabel(year, month);
    const fullName = userInfo.nomComplete;

    // calculateTotals
    let totalMiscExpenses = 0, miscExpensesCount = 0;
    const mileageCosts = new Map();
    const dailyAllowances = new Map();

    trips.forEach(trip => {
      if (Array.isArray(trip.depenses)) {
        miscExpensesCount += trip.depenses.length;
        trip.depenses.forEach(e => totalMiscExpenses += parseFloat(e.montant) || 0);
      }
      
      const dist = parseFloat(trip.distanceKm) || 0;
      if (dist > 0) {
        // Use the first available kilometric rate for the role
        const roleKilometricRate = roleKilometricRates[0];
        if (roleKilometricRate) {
          const rate = parseFloat(roleKilometricRate.tarifParKm) || 0;
          const cost = dist * rate;
          const libelle = roleKilometricRate.libelle || '(Véhicule non spécifié)';
          if (!mileageCosts.has(libelle)) mileageCosts.set(libelle, { distance: 0, total: 0, rate });
          const cur = mileageCosts.get(libelle);
          cur.distance += dist; 
          cur.total += cost;
        }
      }
      
      const mr = roleMissionRates.find(r => r.typeDeDeplacementId === trip.typeDeDeplacementId);
      if (mr) {
        const rate = parseFloat(mr.tarifParJour) || 0;
        const name = travelTypes.find(t => t.id === trip.typeDeDeplacementId)?.nom || 'Inconnu';
        if (!dailyAllowances.has(rate)) dailyAllowances.set(rate, { count: 0, total: 0, name });
        const cur = dailyAllowances.get(rate);
        cur.count++; 
        cur.total += rate;
      }
    });

    let grandTotal = totalMiscExpenses;
    mileageCosts.forEach(v => grandTotal += v.total);
    dailyAllowances.forEach(v => grandTotal += v.total);

    // build tableBody
    const tableBody = [
      [
        { text: 'Désignation', bold: true, fillColor: '#f0f0f0' },
        { text: 'Chantier', bold: true, fillColor: '#f0f0f0' },
        { text: 'Quantité', bold: true, fillColor: '#f0f0f0' },
        { text: 'Taux / J', bold: true, fillColor: '#f0f0f0' },
        { text: 'Montant', bold: true, fillColor: '#f0f0f0' }
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
                { text:'Signature du responsable', alignment:'center', border:[true,true,true,false] }
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
        header: { fontSize:16, bold:true, alignment:'center', margin:[0,0,0,20] },
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