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
  // Validate that the file is a PDF
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext !== '.pdf' || file.mimetype !== 'application/pdf') {
    return cb(new ApiError(400, 'Only PDF files are allowed'), false);
  }
  cb(null, true);
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

    return {
      ...item,
      uploadedAt: formattedDate,
      createdAt: formattedDate,
    };
  });

  res.json(normalized);
}));

// ── POST /api/notes/upload ────────────────────────────────────────────────────
// Upload a note PDF and save metadata in Firestore
router.post('/upload', authenticateUser, upload.single('file'), asyncHandler(async (req, res) => {
  const { title, subject } = req.body;

  if (!req.file) {
    throw new ApiError(400, 'No file was uploaded. Please attach a PDF file.');
  }
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (!subject || !subject.trim()) {
    throw new ApiError(400, 'Subject is required');
  }

  // Construct dynamic access URL using the incoming request protocol and host
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

  const noteMetadata = {
    title: title.trim(),
    subject: subject.trim().toUpperCase(),
    uploader: req.user.name || 'Anonymous Student',
    uploadedBy: req.user.name || 'Anonymous Student', // backward compatibility
    fileUrl: fileUrl,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    downloads: 0,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('notes').add(noteMetadata);

  console.log(`[Notes] Note uploaded successfully! Doc ID: ${docRef.id}, File: ${req.file.filename}`);

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
