const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper function to get uploads path
function getUploadsPath() {
  if (process.pkg) {
    return path.join(path.dirname(process.execPath), 'dist', 'uploads');
  } else {
    return path.join(__dirname, "../uploads");
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsPath = getUploadsPath();
    
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    cb(null, uploadsPath);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${file.fieldname}-${ts}${ext}`;
    
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "application/pdf"];
  const isAllowed = allowed.includes(file.mimetype);
  
  cb(null, isAllowed);
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 
  }
});

// Add error handling
const uploadWithErrorHandling = (req, res, next) => {
  
  upload.single('justificatif')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    } else if (err) {
      console.error('❌ Other upload error:', err);
      return res.status(500).json({ error: 'Unknown upload error: ' + err.message });
    }
    
    next();
  });
};

module.exports = { upload, uploadWithErrorHandling };