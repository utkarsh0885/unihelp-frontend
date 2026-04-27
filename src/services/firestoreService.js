/**
 * Firestore Service – Database CRUD
 * ─────────────────────────────────────────────
 * All Firestore read/write operations for the
 * app's collections: posts, notes, doubts,
 * events, items.
 *
 * Uses: firebase/firestore
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// ──────────────────────────────────────────────
// Posts
// ──────────────────────────────────────────────

/**
 * Fetch all posts, ordered by most recent.
 * @param {number} max – max posts to return
 * @returns {Promise<Array>}
 */
export const getPosts = async (max = 20) => {
  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(max),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getPosts error:', e);
    return [];
  }
};

/**
 * Create a new post.
 * @param {object} post – { content, username, avatar }
 * @returns {Promise<string>} – new document ID
 */
export const createPost = async (post) => {
  const docRef = await addDoc(collection(db, 'posts'), {
    ...post,
    likes: 0,
    liked: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Toggle like on a post (increment/decrement).
 * @param {string} postId
 * @param {boolean} currentlyLiked
 */
export const toggleLike = async (postId, currentlyLiked) => {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    likes: increment(currentlyLiked ? -1 : 1),
  });
};

// ──────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────

export const getNotes = async () => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'notes'), orderBy('createdAt', 'desc')),
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getNotes error:', e);
    return [];
  }
};

export const addNote = async (note) => {
  return await addDoc(collection(db, 'notes'), {
    ...note,
    downloads: 0,
    createdAt: serverTimestamp(),
  });
};

// ──────────────────────────────────────────────
// Doubts
// ──────────────────────────────────────────────

export const getDoubts = async () => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'doubts'), orderBy('createdAt', 'desc')),
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getDoubts error:', e);
    return [];
  }
};

export const addDoubt = async (doubt) => {
  return await addDoc(collection(db, 'doubts'), {
    ...doubt,
    upvotes: 0,
    answers: 0,
    createdAt: serverTimestamp(),
  });
};

// ──────────────────────────────────────────────
// Events
// ──────────────────────────────────────────────

export const getEvents = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'events'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getEvents error:', e);
    return [];
  }
};



// ──────────────────────────────────────────────
// Buy/Sell Items
// ──────────────────────────────────────────────

export const getItems = async () => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'items'), orderBy('createdAt', 'desc')),
    );
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[Firestore] getItems error:', e);
    return [];
  }
};

export const addItem = async (item) => {
  return await addDoc(collection(db, 'items'), {
    ...item,
    createdAt: serverTimestamp(),
  });
};

/**
 * Delete a document from any collection.
 * @param {string} collectionName
 * @param {string} docId
 */
export const deleteDocument = async (collectionName, docId) => {
  await deleteDoc(doc(db, collectionName, docId));
};
