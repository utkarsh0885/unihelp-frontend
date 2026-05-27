const Post = require('../models/Post');
const Report = require('../models/Report');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// ── Allowed category values (must match Post model enum) ──
const ALLOWED_CATEGORIES = ['General', 'Buy/Sell', 'Events', 'Lost & Found', 'Notes', 'Other'];

exports.createPost = asyncHandler(async (req, res) => {
  const { title, content, category, imageUrl, poll, price, condition } = req.body;

  // Input validation
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }
  if (!content || !content.trim()) {
    throw new ApiError(400, 'Content is required');
  }
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    throw new ApiError(400, `Invalid category. Allowed: ${ALLOWED_CATEGORIES.join(', ')}`);
  }
  if (title.length > 200) {
    throw new ApiError(400, 'Title must be 200 characters or less');
  }
  if (content.length > 5000) {
    throw new ApiError(400, 'Content must be 5000 characters or less');
  }

  // Validate poll structure if provided
  if (poll) {
    if (!poll.options || !Array.isArray(poll.options) || poll.options.length < 2) {
      throw new ApiError(400, 'Poll must have at least 2 options');
    }
    if (poll.options.length > 10) {
      throw new ApiError(400, 'Poll cannot have more than 10 options');
    }
  }

  const post = await Post.create({
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    imageUrl,
    poll,
    price,
    condition,
    author: req.user.id,
    authorName: req.user.name || 'User',
  });

  const obj = post.toObject();
  obj.id = obj._id.toString();
  obj.username = obj.authorName;
  obj.avatar = (obj.authorName || 'U').charAt(0).toUpperCase();
  obj.commentsCount = 0;

  res.status(201).json(obj);
});

exports.getPosts = asyncHandler(async (req, res) => {
  const { category, authorId, page = 1, limit = 30 } = req.query;
  const query = {};
  if (category) {
    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new ApiError(400, `Invalid category filter: "${category}"`);
    }
    query.category = category;
  }
  if (authorId) query.author = authorId;

  // Pagination: clamp to reasonable bounds
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
  const skip = (pageNum - 1) * limitNum;

  console.log(`[Posts] GET /api/posts | category=${category ?? 'all'} | page=${pageNum} | limit=${limitNum} | user=${req.user?.id ?? 'anonymous'}`);

  const [posts, total] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('author', 'name avatar')
      .lean(),
    Post.countDocuments(query),
  ]);

  // Normalize MongoDB _id → id so the frontend can use item.id safely
  const normalized = posts.map((p) => ({
    ...p,
    id: p._id.toString(),
    username: p.authorName || p.author?.name || 'User',
    avatar: (p.authorName || p.author?.name || 'U').charAt(0).toUpperCase(),
    commentsCount: p.commentsCount ?? 0,
  }));

  console.log(`[Posts] ✅ Returning ${normalized.length}/${total} posts (page ${pageNum})`);

  // Return array directly for backward compatibility
  // Frontend currently expects a plain array, not { data, pagination }
  res.json(normalized);
});

exports.getPostById = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id).populate('author', 'name avatar').lean();
  if (!post) throw new ApiError(404, 'Post not found');

  res.json({
    ...post,
    id: post._id.toString(),
    username: post.authorName || post.author?.name || 'User',
    avatar: (post.authorName || post.author?.name || 'U').charAt(0).toUpperCase(),
    commentsCount: post.commentsCount ?? 0,
  });
});

exports.updatePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  // Only author or admin can update
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized to edit this post');
  }

  const { title, content, category, imageUrl } = req.body;
  if (title !== undefined) {
    if (!title.trim()) throw new ApiError(400, 'Title cannot be empty');
    post.title = title.trim();
  }
  if (content !== undefined) {
    if (!content.trim()) throw new ApiError(400, 'Content cannot be empty');
    post.content = content.trim();
  }
  if (category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new ApiError(400, `Invalid category: "${category}"`);
    }
    post.category = category;
  }
  if (imageUrl !== undefined) post.imageUrl = imageUrl;

  await post.save();
  const obj = post.toObject();
  obj.id = obj._id.toString();
  res.json(obj);
});

exports.toggleLike = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  const userId = req.user.id;
  const likeIndex = post.likedBy.indexOf(userId);

  if (likeIndex > -1) {
    post.likedBy.splice(likeIndex, 1);
    post.likes = Math.max(0, post.likes - 1);
  } else {
    post.likedBy.push(userId);
    post.likes += 1;
  }

  await post.save();
  res.json({ likes: post.likes, likedBy: post.likedBy });
});

exports.toggleSave = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  const userId = req.user.id;
  const saveIndex = post.savedBy.indexOf(userId);

  if (saveIndex > -1) {
    post.savedBy.splice(saveIndex, 1);
  } else {
    post.savedBy.push(userId);
  }

  await post.save();
  res.json({ savedBy: post.savedBy });
});

exports.votePoll = asyncHandler(async (req, res) => {
  const { optionIndex } = req.body;

  // Validate optionIndex
  if (optionIndex === undefined || optionIndex === null) {
    throw new ApiError(400, 'optionIndex is required');
  }
  const idx = parseInt(optionIndex, 10);
  if (isNaN(idx) || idx < 0) {
    throw new ApiError(400, 'optionIndex must be a non-negative integer');
  }

  const post = await Post.findById(req.params.id);
  if (!post || !post.poll) throw new ApiError(404, 'Poll not found');

  if (idx >= post.poll.options.length) {
    throw new ApiError(400, `optionIndex ${idx} is out of bounds (max: ${post.poll.options.length - 1})`);
  }

  if (post.poll.votedBy.includes(req.user.id)) {
    throw new ApiError(400, 'Already voted');
  }

  post.poll.options[idx].votes += 1;
  post.poll.votedBy.push(req.user.id);
  await post.save();

  res.json(post.poll);
});

exports.flagPost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  await Post.findByIdAndUpdate(req.params.id, { isFlagged: true });

  await Report.create({
    targetType: 'post',
    targetId: req.params.id,
    reason: reason || 'Community Flag',
    reporter: req.user.id,
  });

  res.json({ success: true, message: 'Post flagged for review' });
});

exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new ApiError(404, 'Post not found');

  // Only author or admin can delete
  if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized');
  }

  await post.deleteOne();
  res.json({ success: true, message: 'Post deleted' });
});
