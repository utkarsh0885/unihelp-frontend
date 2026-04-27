/**
 * Data Service – Firebase Firestore
 * ─────────────────────────────────────────────
 * All CRUD operations use remote Firestore.
 */

import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
  limit,
  runTransaction,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig';

const now = () => new Date().toISOString();

// ══════════════════════════════════════
// POSTS
// ══════════════════════════════════════

export const subscribeToPosts = (callback) => {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      callback(posts);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToPosts error:', e);
    return () => {};
  }
};

export const addPost = async (post) => {
  const fullPost = {
    title: post.title || '',
    content: post.content,
    category: post.category || 'General',
    imageUrl: post.imageUrl || null,
    poll: post.poll || null,
    username: post.username || 'Anonymous',
    avatar: post.avatar || 'U',
    userId: post.userId || 'local',
    likes: 0,
    likedBy: [],
    savedBy: [],
    commentsCount: 0,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'posts'), fullPost);
  return docRef.id;
};

export const toggleLikePost = async (postId, userId, currentlyLiked) => {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    likes: increment(currentlyLiked ? -1 : 1),
    likedBy: currentlyLiked ? arrayRemove(userId) : arrayUnion(userId)
  });
};

export const toggleSavePost = async (postId, userId, currentlySaved) => {
  const ref = doc(db, 'posts', postId);
  await updateDoc(ref, {
    savedBy: currentlySaved ? arrayRemove(userId) : arrayUnion(userId)
  });
};

export const deletePostService = async (postId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    
    // Also delete associated comments
    const commentsQuery = query(collection(db, 'comments'), where('postId', '==', postId));
    const commentDocs = await getDocs(commentsQuery);
    const deletePromises = commentDocs.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    
    await deleteDoc(postRef);
    console.log('[DataService] Post and its comments deleted:', postId);
    return true;
  } catch (e) {
    console.error('[DataService] deletePostService error:', e);
    throw e;
  }
};

export const updatePostService = async (postId, updates) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    console.log('[DataService] Post updated:', postId);
    return true;
  } catch (e) {
    console.error('[DataService] updatePostService error:', e);
    throw e;
  }
};

export const votePollService = async (postId, optionIndex, userId) => {
  try {
    const postRef = doc(db, 'posts', postId);
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      if (!postDoc.exists()) throw "Post does not exist!";
      
      const postData = postDoc.data();
      if (!postData.poll) throw "Post is not a poll!";
      if (postData.poll.votedBy?.includes(userId)) return;

      const newOptions = [...postData.poll.options];
      newOptions[optionIndex] = {
        ...newOptions[optionIndex],
        votes: (newOptions[optionIndex].votes || 0) + 1
      };

      transaction.update(postRef, {
        'poll.options': newOptions,
        'poll.votedBy': arrayUnion(userId)
      });
    });
    console.log('[DataService] Vote recorded for post:', postId);
  } catch (e) {
    console.error('[DataService] votePollService error:', e);
  }
};

// ══════════════════════════════════════
// COMMENTS
// ══════════════════════════════════════

export const subscribeToComments = (postId, callback) => {
  try {
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', postId)
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      // Client-side sort by createdAt (Ascending)
      docs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToComments error:', e);
    return () => {};
  }
};

export const addCommentService = async (comment) => {
  const fullComment = {
    postId: comment.postId,
    content: comment.content,
    username: comment.username || 'Anonymous',
    avatar: comment.avatar || 'U',
    userId: comment.userId || 'local',
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'comments'), fullComment);
  
  const postRef = doc(db, 'posts', comment.postId);
  await updateDoc(postRef, {
    commentsCount: increment(1)
  });

  return docRef.id;
};

// ══════════════════════════════════════
// DOUBTS
// ══════════════════════════════════════

export const subscribeToDoubts = (callback) => {
  try {
    const q = query(collection(db, 'doubts'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToDoubts error:', e);
    return () => {};
  }
};

export const addDoubtService = async (doubt) => {
  const fullDoubt = {
    ...doubt,
    upvotes: 0,
    upvotedBy: [],
    answers: 0,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'doubts'), fullDoubt);
  return docRef.id;
};

export const upvoteDoubtService = async (doubtId, userId, currentlyUpvoted) => {
  const ref = doc(db, 'doubts', doubtId);
  await updateDoc(ref, {
    upvotes: increment(currentlyUpvoted ? -1 : 1),
    upvotedBy: currentlyUpvoted ? arrayRemove(userId) : arrayUnion(userId)
  });
};

// ══════════════════════════════════════
// NOTES
// ══════════════════════════════════════

export const subscribeToNotes = (callback) => {
  try {
    const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToNotes error:', e);
    return () => {};
  }
};

export const addNoteService = async (note) => {
  const fullNote = {
    ...note,
    downloads: 0,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'notes'), fullNote);
  return docRef.id;
};

export const downloadNoteService = async (noteId) => {
  const ref = doc(db, 'notes', noteId);
  await updateDoc(ref, {
    downloads: increment(1)
  });
};

// ══════════════════════════════════════
// ITEMS (Buy/Sell)
// ══════════════════════════════════════

export const subscribeToItems = (callback) => {
  try {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      callback(items);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToItems setup error:', e);
    return () => {};
  }
};

export const addItemService = async (item) => {
  try {
    const itemData = {
      title: item.title,
      price: item.price,
      condition: item.condition || 'Good',
      seller: item.seller || 'Anonymous',
      userId: item.userId || 'local',
      category: item.category || 'Other',
      status: 'Available',
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'items'), itemData);
    return docRef.id;
  } catch (e) {
    console.error('[DataService] addItemService error:', e);
    throw e;
  }
};

export const reserveItemService = async (itemId, userId) => {
  try {
    const itemRef = doc(db, 'items', itemId);
    await updateDoc(itemRef, {
      status: 'Reserved',
      reservedBy: userId
    });
    return true;
  } catch (e) {
    console.error('[DataService] reserveItemService error:', e);
    return false;
  }
};

// ══════════════════════════════════════
// EVENTS
// ══════════════════════════════════════

export const subscribeToEvents = (callback) => {
  try {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      }));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToEvents error:', e);
    return () => {};
  }
};

export const addEventService = async (event) => {
  const fullEvent = {
    ...event,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'events'), fullEvent);
  return docRef.id;
};

// ══════════════════════════════════════
// CHATS & MESSAGES
// ══════════════════════════════════════

export const subscribeToChats = (callback) => {
  try {
    const q = query(collection(db, 'chats'), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() || d.data().updatedAt
      }));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToChats error:', e);
    return () => {};
  }
};

export const getOrCreateChat = async (buyerId, sellerId, item) => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef,
      where('participantIds', 'array-contains', buyerId),
      where('itemId', '==', item.id)
    );
    
    const snapshot = await getDocs(q);
    let chatDoc = snapshot.docs.find(d => d.data().participantIds.includes(sellerId));

    if (chatDoc) {
      return { id: chatDoc.id, ...chatDoc.data() };
    }

    const newChat = {
      participantIds: [buyerId, sellerId],
      buyerId,
      sellerId,
      itemId: item.id,
      itemTitle: item.title,
      itemPrice: item.price,
      itemImage: item.imageUrl || '',
      lastMessage: '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(chatsRef, newChat);
    return { id: docRef.id, ...newChat };
  } catch (e) {
    throw e;
  }
};

export const subscribeToMessages = (chatId, callback) => {
  try {
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        timestamp: d.data().timestamp?.toDate?.()?.toISOString() || d.data().timestamp
      }));
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToMessages error:', e);
    return () => {};
  }
};

export const addMessageService = async (chatId, message) => {
  try {
    const msgData = {
      chatId,
      senderId: message.senderId,
      text: message.text,
      timestamp: serverTimestamp(),
    };

    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), msgData);

    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: message.text,
      updatedAt: serverTimestamp()
    });

    return msgRef.id;
  } catch (e) {
    throw e;
  }
};

// ══════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════

export const subscribeToNotifications = (userId, callback) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', [userId, 'everyone']),
      limit(50)
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt
      })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      callback(docs);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToNotifications error:', e);
    return () => {};
  }
};

export const addNotificationService = async (notif) => {
  const fullNotif = {
    ...notif,
    read: false,
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(collection(db, 'notifications'), fullNotif);
  return docRef.id;
};

export const markNotificationReadService = async (notifId) => {
  const ref = doc(db, 'notifications', notifId);
  await updateDoc(ref, { read: true });
};

export const markAllNotificationsReadService = async (userId) => {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  const snapshot = await getDocs(q);
  const promises = snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { read: true }));
  await Promise.all(promises);
};

export const initSeedData = async () => {
  console.log('[DataService] Cloud Mode Active.');
};

// ══════════════════════════════════════
// PRESENCE & STATS
// ══════════════════════════════════════

export const updateUserPresence = async (userId, isOnline) => {
  if (!userId) return;
  try {
    const ref = doc(db, 'users', userId);
    await setDoc(ref, { 
      isOnline, 
      lastActive: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn('[DataService] updateUserPresence error:', e);
  }
};

export const subscribeToActiveUsersCount = (callback) => {
  try {
    const q = query(collection(db, 'users'), where('isOnline', '==', true));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.size);
    });
  } catch (e) {
    console.warn('[DataService] subscribeToActiveUsersCount error:', e);
    callback(0);
    return () => {};
  }
};
