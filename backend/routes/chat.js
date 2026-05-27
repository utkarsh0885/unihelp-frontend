const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateUser } = require('../middlewares/authMiddleware');

// All chat routes require authentication
router.use(authenticateUser);

router.get('/', chatController.getChats);
router.get('/unread-count', chatController.getUnreadCount);
router.post('/init', chatController.getOrCreateChat);
router.get('/:chatId/messages', chatController.getMessages);

// REST message sending (replaces socket send_message event)
router.post('/:chatId/messages', chatController.sendMessage);

module.exports = router;
