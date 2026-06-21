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
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebaseConfig';


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

/**
 * Upload a note PDF to Firebase Storage.
 * Unique file path: notes/{userId}/{timestamp}_{filename}
 */
export const uploadNoteFile = async (uri, userId, filename, onProgress) => {
  const response = await fetch(uri);
  const blob = await response.blob();

  const timestamp = Date.now();
  const uniqueName = `${timestamp}_${filename}`;
  const fileRef = ref(storage, `notes/${userId}/${uniqueName}`);

  const uploadTask = uploadBytesResumable(fileRef, blob);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            downloadUrl,
            fileName: uniqueName,
            fileSize: blob.size,
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
};

export const addNote = async (note) => {
  const docRef = await addDoc(collection(db, 'notes'), {
    title: note.title,
    subject: note.subject,
    uploadedBy: note.uploadedBy,
    uploadedAt: serverTimestamp(),
    fileUrl: note.fileUrl,
    fileSize: note.fileSize,
    fileName: note.fileName,
    downloads: 0,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
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

export const incrementDownloads = async (noteId) => {
  const ref = doc(db, 'notes', noteId);
  await updateDoc(ref, {
    downloads: increment(1),
  });
};

