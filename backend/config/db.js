const admin = require('firebase-admin');

// ── Firebase Admin Initialization ──────────────────────────────────────────
// Configured to initialize using environment variables on Render.
// If variables are missing, it falls back to basic project-level config.
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const initFirebase = async () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('📡 [Firebase] Admin SDK initialized successfully via Service Account Cert');
    } else {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'unihelp-5d4dc',
      });
      console.log('📡 [Firebase] Admin SDK initialized with basic Project ID fallback');
    }
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      console.log('📡 [Firebase] Admin SDK already initialized (duplicate app caught)');
    } else {
      console.error('❌ [Firebase] Failed to initialize Admin SDK:', error.message);
      throw error;
    }
  }
};

// Initialize immediately so db exports are populated correctly
initFirebase().catch((err) => console.error('❌ [Firebase] Critical startup error:', err.message));

const db = admin.firestore();

// Standardize Firestore ID settings
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch (e) {
  // settings might be locked if already set
}

module.exports = { admin, db, initFirebase };
