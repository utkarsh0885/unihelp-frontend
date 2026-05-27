const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

/**
 * Get all chats for the current user
 */
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userChats = await Chat.find({ participantIds: userId })
      .populate('participantIds', 'name avatar isOnline')
      .sort({ updatedAt: -1 });
    res.json(userChats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const chats = await Chat.find({ participantIds: userId });
    const totalUnread = chats.reduce((sum, chat) => {
      return sum + (chat.unreadCounts.get(userId.toString()) || 0);
    }, 0);
    res.json({ count: totalUnread });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
};

/**
 * Get or create a chat between two users
 */
exports.getOrCreateChat = async (req, res) => {
  const { recipientId, recipientName, item, postId } = req.body;
  const userId = req.user.id;
  
  if (!recipientId) {
    return res.status(400).json({ error: 'Recipient ID is required' });
  }

  try {
    // Find existing chat between these users for this post
    let chat = await Chat.findOne({
      participantIds: { $all: [userId, recipientId] },
      postId: postId || null
    });

    if (!chat) {
      chat = await Chat.create({
        participantIds: [userId, recipientId],
        postId: postId || null,
        itemTitle: item ? item.title : null,
        itemPrice: item ? item.price : null,
        itemImage: item ? item.imageUrl : null,
        unreadCounts: {
          [userId]: 0,
          [recipientId]: 0
        }
      });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize chat' });
  }
};

/**
 * Get message history for a specific chat
 */
exports.getMessages = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { page = 1, limit = 50 } = req.query;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.participantIds.includes(userId)) return res.status(403).json({ error: 'Access denied' });

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Reset unread count for this user
    chat.unreadCounts.set(userId, 0);
    await chat.save();

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Send a message via REST (replaces socket send_message event)
 * POST /api/chat/:chatId/messages
 */
exports.sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { text } = req.body;
  const userId = req.user.id;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    if (!chat.participantIds.map(String).includes(String(userId))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Save message to DB
    const message = await Message.create({
      chatId,
      senderId: userId,
      text: text.trim(),
      status: 'sent',
    });

    // Update chat's lastMessage and unread count for the recipient
    const recipientId = chat.participantIds.find(
      (id) => id.toString() !== userId.toString()
    );
    chat.lastMessage = { text: message.text, senderId: userId, timestamp: message.createdAt };
    if (recipientId) {
      const currentUnread = chat.unreadCounts.get(recipientId.toString()) || 0;
      chat.unreadCounts.set(recipientId.toString(), currentUnread + 1);
    }
    await chat.save();

    console.log(`[Chat] ✉️  Message sent in chat ${chatId} by user ${userId}`);
    res.status(201).json(message);
  } catch (error) {
    console.error('[Chat] sendMessage error:', error.message);
    res.status(500).json({ error: 'Failed to send message' });
  }
};
