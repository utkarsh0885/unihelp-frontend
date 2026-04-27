import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

/**
 * FIREBASE CONFIGURATION
 * ─────────────────────────────────────────────
 * Replace the placeholders below with your actual
 * configuration from the Firebase Console:
 * Project Settings > General > Your apps
 */
const firebaseConfig = {
  apiKey: "AIzaSyDV-TMZJX59_5GkVyMSozSb3BBYu-Gi0k8",
  authDomain: "unihelp-5d4dc.firebaseapp.com",
  projectId: "unihelp-5d4dc",
  storageBucket: "unihelp-5d4dc.firebasestorage.app",
  messagingSenderId: "141045857859",
  appId: "1:141045857859:web:78375d7daf566ae9c3def6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
