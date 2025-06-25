const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper function to get uploads path (same as in your main server file)
function getUploadsPath() {
  if (process.pkg) {
    // Packaged app: uploads are in deploy/dist/uploads/
    return path.join(path.dirname(process.execPath), 'dist', 'uploads');
  } else {
    // Development: uploads are in backend/uploads/
    return path.join(__dirname, "../uploads");
  }
}

// Store files under the correct uploads directory with original filename + timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = getUploadsPath();
    
    // Ensure the directory exists
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${ts}${ext}`);
  }
});

// Only allow images and pdfs
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  cb(null, allowed.includes(file.mimetype));
};

module.exports = multer({ storage, fileFilter });