const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, admin } = require('../config/db');
const { authenticateUser } = require('../middlewares/authMiddleware');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { getEpoch } = require('../utils/dateUtils');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // Validate that the file is a PDF (be lenient: accept if either extension is .pdf OR mimetype is application/pdf)
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  if (ext === '.pdf' || mime === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only PDF files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ── GET /api/notes ───────────────────────────────────────────────────────────
// List all uploaded notes, sorted by upload date descending
router.get('/', asyncHandler(async (req, res) => {
  console.log('[Notes] GET /api/notes | Fetching all study resources');
  
  const snapshot = await db.collection('notes').orderBy('createdAt', 'desc').limit(100).get();
  const list = [];
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    list.push({
      id: doc.id,
      ...data,
    });
  });

  // Sort helper to handle potential network timestamp delays
  list.sort((a, b) => getEpoch(b.createdAt || b.uploadedAt) - getEpoch(a.createdAt || a.uploadedAt));

  const normalized = list.map(item => {
    let formattedDate = new Date().toISOString();
    const epoch = getEpoch(item.createdAt || item.uploadedAt);
    if (epoch > 0) {
      formattedDate = new Date(epoch).toISOString();
    }

    // Resolve fileUrl, falling back to legacy attachments[0].uri
    let fileUrl = item.fileUrl || '';
    if (!fileUrl && Array.isArray(item.attachments) && item.attachments.length > 0) {
      fileUrl = item.attachments[0].uri || '';
    }

    return {
      id: item.id,
      title: item.title || '',
      subject: item.subject || '',
      fileUrl: fileUrl,
      uploadedAt: formattedDate,
      downloads: item.downloads || 0,
      uploadedBy: item.uploadedBy || item.uploader || item.author || 'Anonymous Student',
      fileName: item.fileName || (Array.isArray(item.attachments) && item.attachments[0] && item.attachments[0].name) || 'notes.pdf',
      fileSize: item.fileSize || 0,
    };
  });

  res.json(normalized);
}));

// ── POST /api/notes/upload ────────────────────────────────────────────────────
// Upload a note PDF and save metadata in Firestore
router.post('/upload', authenticateUser, (req, res, next) => {
  if (req.body && req.body.fileUrl) {
    return next();
  }
  upload.single('file')(req, res, next);
}, asyncHandler(async (req, res) => {
  const { title, subject, fileUrl: bodyFileUrl, fileName: bodyFileName, fileSize: bodyFileSize } = req.body;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (!subject || !subject.trim()) {
    throw new ApiError(400, 'Subject is required');
  }

  let fileUrl, fileName, fileSize;

  if (bodyFileUrl) {
    fileUrl = bodyFileUrl;
    fileName = bodyFileName || 'notes.pdf';
    fileSize = bodyFileSize || 0;
  } else {
    if (!req.file) {
      throw new ApiError(400, 'No file was uploaded. Please attach a PDF file.');
    }
    // Construct dynamic access URL using the incoming request protocol and host
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;
  }

  const noteMetadata = {
    title: title.trim(),
    subject: subject.trim().toUpperCase(),
    uploader: req.user.name || 'Anonymous Student',
    uploadedBy: req.user.name || 'Anonymous Student', // backward compatibility
    fileUrl: fileUrl,
    fileName: fileName,
    fileSize: fileSize,
    downloads: 0,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('notes').add(noteMetadata);

  console.log(`[Notes] Note metadata saved successfully! Doc ID: ${docRef.id}, File: ${fileName}`);

  res.status(201).json({
    id: docRef.id,
    ...noteMetadata,
    uploadedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  });
}));

// ── PUT /api/notes/:id/download ──────────────────────────────────────────────
// Increment downloads count for a note
router.put('/:id/download', authenticateUser, asyncHandler(async (req, res) => {
  const ref = db.collection('notes').doc(req.params.id);
  const doc = await ref.get();
  
  if (!doc.exists) {
    throw new ApiError(404, 'Note not found');
  }

  await ref.update({
    downloads: admin.firestore.FieldValue.increment(1)
  });

  res.json({ success: true, message: 'Downloads count incremented' });
}));

module.exports = router;
