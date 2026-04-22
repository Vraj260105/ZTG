const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "uploads/";

// Ensure upload folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {

    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }

});

const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "text/plain", "text/csv", "text/html",
];

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype) || file.mimetype.startsWith("text/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, images, and text files are allowed."));
    }
  },
});

module.exports = upload;