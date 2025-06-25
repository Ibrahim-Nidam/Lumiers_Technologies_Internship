const os = require('os');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs-extra');
const archiver = require('archiver');
const { Op } = require('sequelize');

const {
  generatePDFReport,
  generateExcelReport
} = require('./reportController');

const { User, Deplacement, Depense } = require('../models');

// Helper function to get uploads path (same as in multer config)
function getUploadsPath() {
  if (process.pkg) {
    // Packaged app: uploads are in deploy/dist/uploads/
    return path.join(path.dirname(process.execPath), 'dist', 'uploads');
  } else {
    // Development: uploads are in backend/uploads/
    return path.join(__dirname, '..', 'uploads');
  }
}

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

    // 1) Load user and build ZIP filename
    const user = await User.findByPk(userId);
    const label = getFrenchMonthLabel(+year, +month); // e.g. "juin 2025"
    const safeName = user.nomComplete.replace(/\s+/g, '_');
    const safeLabel = label.replace(/\s+/g, '_');
    const zipName = `${safeName}_${safeLabel}.zip`;

    // Use a unique temporary path for the ZIP file
    const tmpDir = path.join(os.tmpdir(), 'myapp-zips');
    await fs.ensureDir(tmpDir);
    const zipPath = path.join(tmpDir, `${uuidv4()}.zip`);

    // 2) Prepare the ZIP stream
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.on('error', err => next(err));

    // 3) Add expense justificatifs for the chosen month
    const start = new Date(year, month, 1);
    const end = new Date(year, +month + 1, 0);

    const trips = await Deplacement.findAll({
      where: { userId, date: { [Op.between]: [start, end] } },
      include: [{ model: Depense, as: 'depenses' }]
    });

    // Get the correct uploads directory
    const uploadsPath = getUploadsPath();
    console.log(`📁 Using uploads path: ${uploadsPath}`);

    for (const trip of trips) {
      for (const exp of trip.depenses) {
        if (exp.cheminJustificatif) {
          // Use the dynamic uploads path instead of hardcoded path
          const filename = path.basename(exp.cheminJustificatif);
          const fileOnDisk = path.join(uploadsPath, filename);
          
          console.log(`🔍 Looking for file: ${fileOnDisk}`);
          
          if (await fs.pathExists(fileOnDisk)) {
            archive.file(fileOnDisk, {
              name: `justificatifs/${filename}`
            });
            console.log(`✅ Added to ZIP: ${filename}`);
          } else {
            console.warn(`⚠️ Justificatif not found on disk: ${fileOnDisk}`);
          }
        }
      }
    }

    // 4) Generate and append PDF + Excel
    const pdfPath = await generatePDFReport(userId, +year, +month);
    const excelPath = await generateExcelReport(userId, +year, +month);

    archive.file(pdfPath, { name: `Note_de_frais_${safeLabel}.pdf` });
    archive.file(excelPath, { name: `Note_de_frais_${safeLabel}.xlsx` });

    // 5) Finalize ZIP
    await archive.finalize();

    // Set up the response once the ZIP is ready
    output.on('close', async () => {
      try {
        // Delete temporary report files
        await fs.remove(pdfPath);
        await fs.remove(excelPath);
      } catch (err) {
        console.error('Failed to delete temporary report files:', err);
      }

      // Set the proper filename in response headers
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      res.setHeader('Content-Type', 'application/zip');

      res.download(zipPath, zipName, async err => {
        if (err) console.error("→ Download error:", err);
        try {
          await fs.remove(zipPath);
        } catch (unlinkErr) {
          console.error('Failed to delete ZIP file:', unlinkErr);
        }
      });
    });

  } catch (err) {
    console.error("❌ generateZipForUser error:", err);
    next(err);
  }
};