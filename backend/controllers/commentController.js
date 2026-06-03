const { db, admin } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getEpoch } = require('../utils/dateUtils');

exports.createComment = asyncHandler(async (req, res) => {
  const { postId, content } = req.body;

  if (!postId) throw new ApiError(400, 'postId is required');
  if (!content || !content.trim()) throw new ApiError(400, 'Comment content is required');
  if (content.length > 1000) throw new ApiError(400, 'Comment must be 1000 characters or less');

  // Verify the post exists
  const postRef = db.collection('posts').doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) throw new ApiError(404, 'Post not found');

  const newComment = {
    postId,
    content: content.trim(),
    author: req.user.id,
    authorName: req.user.name || 'User',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection('comments').add(newComment);

  // Increment comment count on post
  await postRef.update({
    commentsCount: admin.firestore.FieldValue.increment(1),
  });

  // Normalize for frontend
  const resObj = {
    id: docRef.id,
    ...newComment,
    createdAt: new Date().toISOString(),
    username: newComment.authorName,
    avatar: newComment.authorName.charAt(0).toUpperCase(),
  };

  res.status(201).json(resObj);
});

exports.getCommentsByPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const snapshot = await db.collection('comments').where('postId', '==', postId).get();
  let list = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    list.push({
      id: doc.id,
      ...data,
    });
  });

  // Sort by createdAt ascending in-memory safely to prevent composite index errors
  list.sort((a, b) => getEpoch(a.createdAt) - getEpoch(b.createdAt));

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;
  const paginated = list.slice(skip, skip + limitNum);

  const normalized = paginated.map((c) => {
    let formattedDate = new Date().toISOString();
    const epoch = getEpoch(c.createdAt);
    if (epoch > 0) {
      formattedDate = new Date(epoch).toISOString();
    }
    return {
      ...c,
      createdAt: formattedDate,
      username: c.authorName || 'User',
      avatar: (c.authorName || 'U').charAt(0).toUpperCase(),
    };
  });

  res.json(normalized);
});

exports.deleteComment = asyncHandler(async (req, res) => {
  const commentRef = db.collection('comments').doc(req.params.id);
  const doc = await commentRef.get();
  if (!doc.exists) throw new ApiError(404, 'Comment not found');

  const comment = doc.data();

  if (comment.author !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized');
  }

  // Decrement commentsCount on the post
  const postRef = db.collection('posts').doc(comment.postId);
  const postDoc = await postRef.get();
  if (postDoc.exists) {
    const currentCount = postDoc.data().commentsCount ?? 0;
    await postRef.update({
      commentsCount: Math.max(0, currentCount - 1),
    });
  }

  await commentRef.delete();
  res.json({ success: true, message: 'Comment deleted' });
});
