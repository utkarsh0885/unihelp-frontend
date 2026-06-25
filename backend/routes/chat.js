const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// All chat routes require authentication
router.use(authenticateUser);

// Chat feature is disabled for public release (Uncommented for mock/REST compatibility)
// router.use((req, res) => {
//   return res.status(503).json({ error: 'Chat feature is temporarily disabled for public release.' });
// });

// Kept for chat creation only
router.post('/init', chatController.getOrCreateChat);

// Disabled/Removed to shift complete chat fetching/messaging flow to real-time Firestore client-side
// router.get('/', chatController.getChats);
// router.get('/unread-count', chatController.getUnreadCount);
// router.get('/:chatId/messages', chatController.getMessages);
// router.post('/:chatId/messages', chatController.sendMessage);

module.exports = router;
