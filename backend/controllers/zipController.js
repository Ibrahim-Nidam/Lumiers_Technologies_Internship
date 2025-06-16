// controllers/zipController.js

const path     = require('path');
const fs       = require('fs-extra');
const archiver = require('archiver');
const { Op }   = require('sequelize');

const {
  generatePDFReport,
  generateExcelReport
} = require('./reportController');

const { User, Deplacement, Depense } = require('../models');

/**
 * Returns "Month Year" in French, e.g. "juin 2025"
 */
function getFrenchMonthLabel(year, month) {
  return new Date(year, month).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric'
  });
}

exports.generateZipForUser = async (req, res, next) => {
  try {
    const { userId, year, month } = req.query;
    console.log("→ ZIP request params:", { userId, year, month });

    // 1) Load user and build ZIP filename
    const user   = await User.findByPk(userId);
    const label  = getFrenchMonthLabel(+year, +month);      // e.g. "juin 2025"
    const safeName  = user.nomComplete.replace(/\s+/g, '_');
    const safeLabel = label.replace(/\s+/g, '_');
    const zipName   = `${safeName}_${safeLabel}.zip`;
    console.log("→ Computed ZIP name:", zipName);

    const zipPath = path.join(__dirname, '../tmp', zipName);
    await fs.ensureDir(path.dirname(zipPath));

    // 2) Prepare the ZIP stream
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.on('error', err => next(err));

    output.on('close', () => {
  console.log("→ ZIP finalized, size:", archive.pointer());
  
  // Set the proper filename in response headers
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
  res.setHeader('Content-Type', 'application/zip');
  
  res.download(zipPath, zipName, async err => {
    if (err) console.error("→ Download error:", err);
    else {
      console.log("→ Download sent, removing ZIP");
      await fs.remove(zipPath);
    }
  });
});

    // 3) Add expense justificatifs for the chosen month
    const start = new Date(year, month, 1);
    const end   = new Date(year, +month + 1, 0);
    console.log("→ Gathering trips between", start, "and", end);

    const trips = await Deplacement.findAll({
      where: { userId, date: { [Op.between]: [start, end] } },
      include: [{ model: Depense, as: 'depenses' }]
    });
    console.log(`→ Found ${trips.length} trips for user ${userId}`);

    for (const trip of trips) {
      for (const exp of trip.depenses) {
        if (exp.cheminJustificatif) {
          const fileOnDisk = path.join(__dirname, '..', exp.cheminJustificatif);
          if (await fs.pathExists(fileOnDisk)) {
            console.log("  → Adding justificatif:", fileOnDisk);
            archive.file(fileOnDisk, {
              name: `justificatifs/${path.basename(fileOnDisk)}`
            });
          } else {
            console.warn("  ⚠️ Justificatif not found on disk:", fileOnDisk);
          }
        }
      }
    }

    // 4) Generate and append PDF + Excel
    console.log("→ Generating PDF report...");
    const pdfPath   = await generatePDFReport(userId, +year, +month);
    console.log("→ PDF written to:", pdfPath);

    console.log("→ Generating Excel report...");
    const excelPath = await generateExcelReport(userId, +year, +month);
    console.log("→ Excel written to:", excelPath);

    archive.file(pdfPath,   { name: `Note_de_frais_${label}.pdf`   });
    archive.file(excelPath, { name: `Note_de_frais_${label}.xlsx` });

    // 5) Finalize ZIP
    console.log("→ Finalizing archive...");
    await archive.finalize();

  } catch (err) {
    console.error("❌ generateZipForUser error:", err);
    next(err);
  }
};
