/**
 * controllers/chatController.js
 *
 * Mock/no-op stub since Chat & WebSockets are completely disabled in favor of REST polling.
 */

exports.getChats = async (req, res) => {
  res.json([]);
};

exports.getUnreadCount = async (req, res) => {
  res.json({ count: 0 });
};

exports.getOrCreateChat = async (req, res) => {
  res.json({
    id: 'mock_chat_id',
    participantIds: [req.user?.id || 'user', req.body.recipientId || 'recipient'],
    lastMessage: null,
    unreadCounts: {},
  });
};

exports.getMessages = async (req, res) => {
  res.json([]);
};

exports.sendMessage = async (req, res) => {
  res.status(201).json({
    id: 'mock_message_id',
    chatId: req.params.chatId,
    senderId: req.user?.id || 'user',
    text: req.body.text || '',
    createdAt: new Date().toISOString(),
  });
};
