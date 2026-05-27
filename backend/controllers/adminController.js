const User = require('../models/User');
const Post = require('../models/Post');
const Message = require('../models/Message');
const Report = require('../models/Report');

/**
 * Get Dashboard Analytics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const postCount = await Post.countDocuments();
    const messageCount = await Message.countDocuments();
    const bannedCount = await User.countDocuments({ isBanned: true });

    res.json({
      users: userCount,
      posts: postCount,
      messages: messageCount,
      banned: bannedCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};

/**
 * Manage Users (Ban/Unban/Verify)
 */
exports.updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { isBanned, isVerified, role } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (isBanned !== undefined) user.isBanned = isBanned;
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (role !== undefined) user.role = role;

    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
};

/**
 * Delete any Post (Moderation)
 */
exports.deletePost = async (req, res) => {
  const { postId } = req.params;

  try {
    await Post.findByIdAndDelete(postId);
    res.json({ success: true, message: 'Post deleted by admin' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

/**
 * List Flagged Content
 */
exports.getFlaggedPosts = async (req, res) => {
  try {
    const flaggedReports = await Report.find({ targetType: 'post', status: 'pending' })
      .populate({
        path: 'targetId',
        model: 'Post',
        populate: { path: 'author', select: 'name email' }
      })
      .populate('reporter', 'name email');
    res.json(flaggedReports);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch flagged posts' });
  }
};
