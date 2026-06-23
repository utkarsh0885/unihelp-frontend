const { db, admin } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getEpoch } = require('../utils/dateUtils');

/**
 * Fetch all active conversations for the user
 */
exports.getChats = asyncHandler(async (req, res) => {
  const myId = req.user.id;
  
  const chatsSnapshot = await db.collection('chats')
    .where('participantIds', 'array-contains', myId)
    .get();
  
  let chatsList = [];
  
  for (const doc of chatsSnapshot.docs) {
    const chatData = doc.data();
    
    // For each participant ID, load name & avatar from Firestore 'users' collection
    const participants = [];
    for (const pid of chatData.participantIds) {
      const userDoc = await db.collection('users').doc(pid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        participants.push({
          _id: pid,
          id: pid,
          name: userData.name || 'Student',
          avatar: userData.avatarUrl || null,
        });
      } else {
        participants.push({
          _id: pid,
          id: pid,
          name: 'Student',
          avatar: null,
        });
      }
    }
    
    // Get last message from subcollection
    const messagesSnapshot = await db.collection('chats').doc(doc.id)
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    let lastMessage = null;
    if (!messagesSnapshot.empty) {
      const msgDoc = messagesSnapshot.docs[0];
      const msgData = msgDoc.data();
      let formattedDate = new Date().toISOString();
      const epoch = getEpoch(msgData.createdAt);
      if (epoch > 0) {
        formattedDate = new Date(epoch).toISOString();
      }
      lastMessage = {
        id: msgDoc.id,
        text: msgData.text,
        senderId: msgData.senderId,
        timestamp: formattedDate,
      };
    } else if (chatData.lastMessage) {
      // Fallback to chat document properties
      let formattedDate = new Date().toISOString();
      if (chatData.lastMessage.timestamp) {
        const epoch = getEpoch(chatData.lastMessage.timestamp);
        if (epoch > 0) {
          formattedDate = new Date(epoch).toISOString();
        }
      }
      lastMessage = {
        text: chatData.lastMessage.text || '',
        senderId: chatData.lastMessage.senderId || '',
        timestamp: formattedDate,
      };
    }
    
    let createdAtStr = new Date().toISOString();
    if (chatData.createdAt) {
      if (typeof chatData.createdAt.toDate === 'function') {
        createdAtStr = chatData.createdAt.toDate().toISOString();
      } else if (chatData.createdAt._seconds) {
        createdAtStr = new Date(chatData.createdAt._seconds * 1000).toISOString();
      }
    }

    chatsList.push({
      id: doc.id,
      _id: doc.id,
      participantIds: participants,
      lastMessage,
      createdAt: createdAtStr,
    });
  }

  res.json(chatsList);
});

/**
 * Get unread messages count (stub/mocked to 0)
 */
exports.getUnreadCount = asyncHandler(async (req, res) => {
  res.json({ count: 0 });
});

/**
 * Initialize a chat room or fetch an existing one
 */
exports.getOrCreateChat = asyncHandler(async (req, res) => {
  const { recipientId, recipientName } = req.body;
  if (!recipientId) throw new ApiError(400, 'recipientId is required');

  const myId = req.user.id;

  // Find if chat already exists
  const snapshot = await db.collection('chats')
    .where('participantIds', 'array-contains', myId)
    .get();

  let existingChatDoc = null;
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.participantIds && data.participantIds.includes(recipientId)) {
      existingChatDoc = { id: doc.id, ...data };
    }
  });

  let chatId;
  let chatData;

  if (existingChatDoc) {
    chatId = existingChatDoc.id;
    chatData = existingChatDoc;
  } else {
    // Create new chat
    chatData = {
      participantIds: [myId, recipientId],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastMessage: null,
    };
    const docRef = await db.collection('chats').add(chatData);
    chatId = docRef.id;
    chatData.id = chatId;
    chatData._id = chatId;
  }

  // Populate participants info
  const participants = [];
  for (const pid of chatData.participantIds) {
    const userDoc = await db.collection('users').doc(pid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      participants.push({
        _id: pid,
        id: pid,
        name: userData.name || 'Student',
        avatar: userData.avatarUrl || null,
      });
    } else {
      participants.push({
        _id: pid,
        id: pid,
        name: pid === myId ? (req.user.name || 'You') : (recipientName || 'Student'),
        avatar: null,
      });
    }
  }

  let createdAtStr = new Date().toISOString();
  if (chatData.createdAt) {
    if (typeof chatData.createdAt.toDate === 'function') {
      createdAtStr = chatData.createdAt.toDate().toISOString();
    } else if (chatData.createdAt._seconds) {
      createdAtStr = new Date(chatData.createdAt._seconds * 1000).toISOString();
    }
  }

  res.json({
    id: chatId,
    _id: chatId,
    participantIds: participants,
    lastMessage: chatData.lastMessage || null,
    createdAt: createdAtStr,
  });
});

/**
 * Fetch all messages for a given chat
 */
exports.getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const snapshot = await db.collection('chats').doc(chatId).collection('messages').get();
  
  let list = [];
  snapshot.forEach(doc => {
    list.push({ id: doc.id, _id: doc.id, ...doc.data() });
  });

  list.sort((a, b) => getEpoch(a.createdAt) - getEpoch(b.createdAt));

  const normalized = list.map(m => {
    let formattedDate = new Date().toISOString();
    const epoch = getEpoch(m.createdAt);
    if (epoch > 0) {
      formattedDate = new Date(epoch).toISOString();
    }
    return {
      ...m,
      createdAt: formattedDate,
      timestamp: formattedDate,
    };
  });

  res.json(normalized);
});

/**
 * Send a message within a chat conversation
 */
exports.sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;

  const messageData = {
    chatId,
    senderId: req.user.id,
    text: text || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('chats').doc(chatId).collection('messages').add(messageData);

  // Update lastMessage on chat
  await db.collection('chats').doc(chatId).update({
    lastMessage: {
      text: text || '',
      senderId: req.user.id,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    },
    lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  res.status(201).json({
    id: docRef.id,
    _id: docRef.id,
    chatId,
    senderId: req.user.id,
    text: text || '',
    createdAt: new Date().toISOString(),
    timestamp: new Date().toISOString(),
  });
});
