const { db, admin } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

/**
 * Initialize a chat room or fetch an existing one
 */
exports.getOrCreateChat = asyncHandler(async (req, res) => {
  const { recipientId, recipientName, item } = req.body;
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

    // Trigger notification for new chat started from marketplace
    if (item) {
      try {
        const senderName = req.user.name || 'A buyer';
        const itemTitle = item.title || 'your item';
        await db.collection('notifications').add({
          userId: recipientId,
          title: 'New Chat Query',
          message: `${senderName} started a chat about your item '${itemTitle}'`,
          type: 'chat',
          chatId: chatId,
          postId: item.id || item._id || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          read: false
        });
      } catch (err) {
        console.error('[getOrCreateChat] Error creating notification:', err.message);
      }
    }
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
