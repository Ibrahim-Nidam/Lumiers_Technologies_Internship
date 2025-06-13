const multer = require("multer");
const path = require("path");

// Store files under /uploads with original filename + timestamp
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
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
