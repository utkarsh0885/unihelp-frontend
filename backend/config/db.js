const admin = require('firebase-admin');
const env = require('./env');

// ── Firebase Admin Initialization ──────────────────────────────────────────
// Uses validated credentials from config/env.js.
// Server will NOT start if Firebase credentials are missing.
const privateKey = env.FIREBASE_PRIVATE_KEY
  ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const initFirebase = async () => {
  try {
    if (admin.apps.length > 0) {
      console.log('📡 [Firebase] Admin SDK already initialized (singleton active)');
      return;
    }

    if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      console.log('📡 [Firebase] Admin SDK initialized successfully via Service Account Cert');
    } else {
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || 'unihelp-5d4dc',
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
