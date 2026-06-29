const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { createClient } = require('@supabase/supabase-js');
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
// List uploaded notes with cursor-based pagination, sorted by createdAt descending
router.get('/', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 20;
  console.log(`[Notes] GET /api/notes | Fetching study resources (limit: ${limit}, cursor: ${req.query.cursor || 'none'})`);

  let query = db.collection('notes').orderBy('createdAt', 'desc').limit(limit);

  if (req.query.cursor) {
    const cursorDoc = await db.collection('notes').doc(req.query.cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    } else {
      console.warn(`[Notes] Cursor doc ${req.query.cursor} not found`);
    }
  }

  const snapshot = await query.get();
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
      uploader: item.uploader || item.uploadedBy || item.author || 'Anonymous Student',
      uploadedBy: item.uploadedBy || item.uploader || item.author || 'Anonymous Student',
      userId: item.userId || null,
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
  // Reject oversized payload (> 10KB)
  if (req.body && JSON.stringify(req.body).length > 10240) {
    throw new ApiError(400, 'Metadata payload is oversized (exceeds 10KB)');
  }

  const { title, subject, fileUrl: bodyFileUrl, fileName: bodyFileName, fileSize: bodyFileSize } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (title.trim().length > 150) {
    throw new ApiError(400, 'Title exceeds maximum allowed length of 150 characters');
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw new ApiError(400, 'Subject is required');
  }
  if (subject.trim().length > 50) {
    throw new ApiError(400, 'Subject exceeds maximum allowed length of 50 characters');
  }

  let fileUrl, fileName, fileSize;

  if (bodyFileUrl !== undefined && bodyFileUrl !== null) {
    fileUrl = String(bodyFileUrl).trim();
    fileName = bodyFileName ? String(bodyFileName).trim() : 'notes.pdf';
    fileSize = bodyFileSize !== undefined ? Number(bodyFileSize) : 0;
  } else {
    if (!req.file) {
      throw new ApiError(400, 'No file was uploaded. Please attach a PDF file.');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    fileName = req.file.originalname;
    fileSize = req.file.size;
  }

  // 1. Reject empty URLs
  if (!fileUrl) {
    throw new ApiError(400, 'File URL is required and cannot be empty');
  }

  // 2. Reject oversized metadata fields
  if (fileUrl.length > 1024) {
    throw new ApiError(400, 'File URL exceeds maximum allowed length of 1024 characters');
  }
  if (fileName.length > 255) {
    throw new ApiError(400, 'File name exceeds maximum allowed length of 255 characters');
  }
  if (isNaN(fileSize) || fileSize < 0 || fileSize > 10 * 1024 * 1024) {
    throw new ApiError(400, 'File size exceeds maximum allowed limit of 10MB');
  }

  // 3. URL Parsing & Protocol check (Reject http://, Reject ftp://, Only allow HTTPS)
  let parsedUrl;
  try {
    parsedUrl = new URL(fileUrl);
  } catch (err) {
    throw new ApiError(400, 'Invalid file URL format');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new ApiError(400, `Only HTTPS URLs are allowed (received ${parsedUrl.protocol})`);
  }

  // 4. Domain & Bucket verification (Reject unknown domains, Only allow configured Supabase bucket)
  const configuredSupabaseUrl = env.SUPABASE_URL || 'https://ncjurvdrhdncwcvdoxao.supabase.co';
  let expectedHost;
  try {
    expectedHost = new URL(configuredSupabaseUrl).hostname;
  } catch (err) {
    expectedHost = 'ncjurvdrhdncwcvdoxao.supabase.co';
  }

  if (parsedUrl.hostname.toLowerCase() !== expectedHost.toLowerCase()) {
    throw new ApiError(400, `Unknown domain. Only URLs from ${expectedHost} are allowed`);
  }

  const configuredBucket = env.SUPABASE_NOTES_BUCKET || 'notes';
  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
  const isSupabaseStorage = pathSegments[0] === 'storage' && pathSegments[1] === 'v1' && pathSegments[2] === 'object';
  if (!isSupabaseStorage || (pathSegments[3] !== configuredBucket && pathSegments[4] !== configuredBucket)) {
    throw new ApiError(400, `File URL must belong to the configured Supabase Storage bucket (${configuredBucket})`);
  }

  // 5. Reject non-PDF URLs
  const urlExt = path.extname(parsedUrl.pathname).toLowerCase();
  const nameExt = fileName ? path.extname(fileName).toLowerCase() : '.pdf';
  if (urlExt !== '.pdf' || (fileName && nameExt !== '.pdf')) {
    throw new ApiError(400, 'Only PDF files are allowed');
  }

  // 6. Ownership & Schema Enforcement
  const userId = req.user && (req.user.id || req.user.uid || req.user._id);
  console.log("========== NOTES DEBUG ==========");
  console.log("REQ.USER =", req.user);
  console.log("USER ID =", userId);
  console.log("================================");
  if (!userId) {
    throw new ApiError(401, 'User ID missing from authentication token');
  }

  const uploaderName = req.user.name || 'Anonymous Student';

  const noteMetadata = {
    title: title.trim(),
    subject: subject.trim().toUpperCase(),
    fileUrl: fileUrl,
    fileName: fileName,
    fileSize: fileSize,
    userId: String(userId),
    uploader: uploaderName,
    uploadedBy: uploaderName, // backward compatibility
    downloads: 0,
    uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('notes').add(noteMetadata);

  console.log(`[Notes] Note metadata saved successfully! Doc ID: ${docRef.id}, File: ${fileName}, User: ${userId}`);

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

  const currentDownloads = doc.data().downloads || 0;
  await ref.update({
    downloads: admin.firestore.FieldValue.increment(1)
  });

  res.json({ success: true, downloads: currentDownloads + 1, message: 'Downloads count incremented' });
}));

// ── DELETE /api/notes/:id ────────────────────────────────────────────────────
// Secure note deletion (owner or admin only)
router.delete('/:id', authenticateUser, asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  console.log('[DEBUG Flow 4] Backend received DELETE /api/notes/' + noteId);
  const noteRef = db.collection('notes').doc(noteId);
  const docSnap = await noteRef.get();

  if (!docSnap.exists) {
    throw new ApiError(404, 'Note not found');
  }

  const noteData = docSnap.data();

  // Verify ownership
  const currentUserId = req.user && (req.user.id || req.user.uid || req.user._id);
  const isAdmin = req.user && (req.user.role === 'admin' || req.user.isAdmin === true);
  const noteUserId = noteData.userId || null;

  // Legacy notes without userId must not be deletable by normal users. Only admin.
  // Normal notes must match req.user.id == note.userId.
  if (!isAdmin && (!noteUserId || String(noteUserId) !== String(currentUserId))) {
    throw new ApiError(403, 'Access Denied: You do not have permission to delete this note');
  }

  // 1. Delete Firestore metadata first
  await noteRef.delete();
  console.log(`[Notes] Successfully deleted Firestore document ${noteId}`);

  // 2. Delete matching PDF from Supabase Storage & handle partial failures
  let warning = null;
  const fileUrl = noteData.fileUrl;
  if (fileUrl) {
    try {
      const bucket = env.SUPABASE_NOTES_BUCKET || 'notes';
      const parsedUrl = new URL(fileUrl);
      const segments = parsedUrl.pathname.split('/');
      const objIndex = segments.indexOf('object');
      if (objIndex !== -1 && segments.length > objIndex + 2) {
        const filePath = segments.slice(objIndex + 3).join('/');
        if (filePath) {
          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
          const { error } = await supabase.storage.from(bucket).remove([filePath]);
          if (error) {
            throw error;
          }
          console.log(`[Notes] Successfully deleted file from Supabase Storage: ${filePath}`);
        }
      }
    } catch (err) {
      console.error(`[Notes] Partial failure: Firestore note ${noteId} deleted, but Supabase Storage file deletion failed:`, err.message || err);
      warning = 'Note deleted from database, but failed to remove associated file from cloud storage.';
    }
  }

  res.status(200).json({
    success: true,
    message: warning ? 'Note deleted with storage warning' : 'Note deleted successfully',
    warning: warning || undefined,
    id: noteId
  });
}));

module.exports = router;
