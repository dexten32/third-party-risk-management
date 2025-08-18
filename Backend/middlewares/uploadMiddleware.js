// middleware/upload.js
import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import s3 from '../utils/s3.js';

// Allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPEG, and PNG files are allowed'), false);
  }
};

// Initialize multer with S3 storage
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const timestamp = Date.now();
      const safeFilename = file.originalname.replace(/\s+/g, '_');
      cb(null, `${timestamp}-${safeFilename}`);
    },
  }),
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

export default upload;
