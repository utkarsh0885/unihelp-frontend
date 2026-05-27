/**
 * controllers/adminController.js
 *
 * Mock/no-op stub for admin features.
 */

const { db } = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const postsSnapshot = await db.collection('posts').get();
    const usersSnapshot = await db.collection('users').get();
    
    res.json({
      users: usersSnapshot.size,
      posts: postsSnapshot.size,
      messages: 0,
      banned: 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

exports.updateUserStatus = async (req, res) => {
  res.json({ success: true, message: 'User status updated' });
};

exports.deletePost = async (req, res) => {
  try {
    await db.collection('posts').doc(req.params.postId).delete();
    res.json({ success: true, message: 'Post deleted by admin' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

exports.getFlaggedPosts = async (req, res) => {
  res.json([]);
};
