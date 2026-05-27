const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateUser, authorizeRoles } = require('../middlewares/authMiddleware');

// All admin routes require 'admin' role
router.use(authenticateUser);
router.use(authorizeRoles('admin'));

router.get('/stats', adminController.getDashboardStats);
router.get('/flagged', adminController.getFlaggedPosts);
router.put('/users/:userId', adminController.updateUserStatus);
router.delete('/posts/:postId', adminController.deletePost);

module.exports = router;
