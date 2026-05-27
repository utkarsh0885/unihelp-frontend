const Comment = require('../models/Comment');
const Post = require('../models/Post');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

exports.createComment = asyncHandler(async (req, res) => {
  const { postId, content } = req.body;

  if (!postId) throw new ApiError(400, 'postId is required');
  if (!content || !content.trim()) throw new ApiError(400, 'Comment content is required');
  if (content.length > 1000) throw new ApiError(400, 'Comment must be 1000 characters or less');

  // Verify the post exists
  const post = await Post.findById(postId);
  if (!post) throw new ApiError(404, 'Post not found');

  const comment = await Comment.create({
    postId,
    content: content.trim(),
    author: req.user.id,
    authorName: req.user.name || 'User',
  });

  // Increment comment count on post
  await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

  // Normalize _id → id for frontend
  const obj = comment.toObject();
  obj.id = obj._id.toString();
  obj.username = obj.authorName;
  obj.avatar = (obj.authorName || 'U').charAt(0).toUpperCase();

  res.status(201).json(obj);
});

exports.getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

  const comments = await Comment.find({ postId })
    .sort({ createdAt: 1 })
    .skip((pageNum - 1) * limitNum)
    .limit(limitNum)
    .populate('author', 'name avatar')
    .lean();

  // Normalize _id → id for frontend
  const normalized = comments.map((c) => ({
    ...c,
    id: c._id.toString(),
    username: c.authorName || c.author?.name || 'User',
    avatar: (c.authorName || c.author?.name || 'U').charAt(0).toUpperCase(),
  }));

  res.json(normalized);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) throw new ApiError(404, 'Comment not found');

  if (comment.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized');
  }

  await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
  await comment.deleteOne();

  res.json({ success: true, message: 'Comment deleted' });
});
