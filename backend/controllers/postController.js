const { db, admin } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getEpoch } = require('../utils/dateUtils');

// ── Allowed category values ──
const ALLOWED_CATEGORIES = ['General', 'Buy/Sell', 'Events', 'Lost & Found', 'Notes', 'Other'];

exports.createPost = asyncHandler(async (req, res) => {
  let { title, content, category, imageUrl, poll, price, condition, date, time, location, color, icon, description } = req.body;

  // Input validation
  if (!title || !title.trim()) {
    throw new ApiError(400, 'Title is required');
  }

  // Handle Event-specific description mapping to content to make content validation pass
  if ((!content || !content.trim()) && category === 'Events' && description) {
    content = description;
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

  const postData = {
    title: title.trim(),
    content: content.trim(),
    category: category || 'General',
    imageUrl: imageUrl || null,
    price: price || null,
    condition: condition || null,
    description: description ? description.trim() : (content ? content.trim() : ''),
    date: date || null,
    time: time || null,
    location: location || null,
    color: color || null,
    icon: icon || null,
    author: req.user.id,
    authorName: req.user.name || 'User',
    likes: 0,
    likedBy: [],
    savedBy: [],
    commentsCount: 0,
    isFlagged: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (poll) {
    postData.poll = {
      options: poll.options.map((opt) => ({
        text: opt.text || opt,
        votes: 0,
      })),
      votedBy: [],
    };
  }

  const docRef = await db.collection('posts').add(postData);

  // Return normalized post
  const resObj = {
    id: docRef.id,
    ...postData,
    createdAt: new Date().toISOString(), // Mock immediate timestamp for speed
    username: postData.authorName,
    avatar: postData.authorName.charAt(0).toUpperCase(),
  };

  res.status(201).json(resObj);
});

exports.getPosts = asyncHandler(async (req, res) => {
  const { category, authorId, page = 1, limit = 50 } = req.query;

  console.log(`[Posts] GET /api/posts | category=${category ?? 'all'} | authorId=${authorId ?? 'all'} | user=${req.user?.id ?? 'anonymous'}`);

  let query = db.collection('posts');

  if (category) {
    query = query.where('category', '==', category);
  } else if (authorId) {
    query = query.where('author', '==', authorId);
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  // Restrict reads to the latest 200 documents to protect database limits
  query = query.limit(200);

  let snapshot = await query.get();
  let list = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    list.push({
      id: doc.id,
      ...data,
    });
  });

  // Sort by createdAt descending safely
  list.sort((a, b) => getEpoch(b.createdAt) - getEpoch(a.createdAt));

  // Pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;
  const paginated = list.slice(skip, skip + limitNum);

  // Normalize structure for frontend mapping
  const normalized = paginated.map((p) => {
    // Standardize dates
    let formattedDate = new Date().toISOString();
    const epoch = getEpoch(p.createdAt);
    if (epoch > 0) {
      formattedDate = new Date(epoch).toISOString();
    }

    return {
      ...p,
      createdAt: formattedDate,
      username: p.authorName || 'User',
      avatar: (p.authorName || 'U').charAt(0).toUpperCase(),
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
      savedBy: p.savedBy ?? [],
      commentsCount: p.commentsCount ?? 0,
    };
  });

  console.log(`[Posts] ✅ Returning ${normalized.length}/${list.length} posts`);
  res.json(normalized);
});

exports.getPostById = asyncHandler(async (req, res) => {
  const doc = await db.collection('posts').doc(req.params.id).get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();
  post.id = doc.id;

  // Normalize createdAt
  let formattedDate = new Date().toISOString();
  const epoch = getEpoch(post.createdAt);
  if (epoch > 0) {
    formattedDate = new Date(epoch).toISOString();
  }

  res.json({
    ...post,
    createdAt: formattedDate,
    username: post.authorName || 'User',
    avatar: (post.authorName || 'U').charAt(0).toUpperCase(),
    likes: post.likes ?? 0,
    likedBy: post.likedBy ?? [],
    savedBy: post.savedBy ?? [],
    commentsCount: post.commentsCount ?? 0,
  });
});

exports.updatePost = asyncHandler(async (req, res) => {
  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();

  // Determine action type
  const isReserveAction = req.body.status === 'Reserved';
  const isCancelByBuyer = req.body.status === 'Available' && post.status === 'Reserved' && post.reservedBy === req.user.id;

  // Block reserving a sold item
  if (post.status === 'Sold' && isReserveAction) {
    throw new ApiError(400, 'Cannot reserve a sold item');
  }

  // Block seller from reserving their own item
  if (isReserveAction && post.author === req.user.id) {
    throw new ApiError(400, 'You cannot reserve your own listing');
  }

  // Block re-reservation on an already reserved item
  if (isReserveAction && post.status === 'Reserved') {
    throw new ApiError(409, 'This item is already reserved by another buyer');
  }

  // Authorization: author, admin, buyer reserving, or buyer cancelling own reservation
  if (post.author !== req.user.id && req.user.role !== 'admin' && !isReserveAction && !isCancelByBuyer) {
    throw new ApiError(403, 'Unauthorized to edit this post');
  }

  // If a non-author/non-admin is reserving it, strip all other update fields
  if (post.author !== req.user.id && req.user.role !== 'admin') {
    for (const key of Object.keys(req.body)) {
      if (key !== 'status' && key !== 'reservedBy' && key !== 'reservedByName' && key !== 'reservedByEmail') delete req.body[key];
    }
  }

  const { title, content, category, imageUrl, price, condition, description, date, time, location, color, icon, status, reservedBy, reservedByName, reservedByEmail, soldAt } = req.body;
  const updates = {};

  if (title !== undefined) {
    if (!title.trim()) throw new ApiError(400, 'Title cannot be empty');
    updates.title = title.trim();
  }
  if (content !== undefined) {
    if (!content.trim()) throw new ApiError(400, 'Content cannot be empty');
    updates.content = content.trim();
  }
  if (category !== undefined) {
    if (!ALLOWED_CATEGORIES.includes(category)) {
      throw new ApiError(400, `Invalid category: "${category}"`);
    }
    updates.category = category;
  }
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (price !== undefined) updates.price = price;
  if (condition !== undefined) updates.condition = condition;
  if (description !== undefined) updates.description = description;
  if (date !== undefined) updates.date = date;
  if (time !== undefined) updates.time = time;
  if (location !== undefined) updates.location = location;
  if (color !== undefined) updates.color = color;
  if (icon !== undefined) updates.icon = icon;
  if (status !== undefined) updates.status = status;

  // Set reservation metadata on reserve action
  if (status === 'Reserved') {
    let resolvedBy = reservedBy || req.user.id;
    let resolvedByName = reservedByName || req.user.name;
    let resolvedByEmail = reservedByEmail || req.user.email;

    // Fetch user document from users collection if the name is not resolved or is a placeholder
    if (!resolvedByName || resolvedByName === 'Unknown' || resolvedByName === 'Student') {
      try {
        const userDoc = await db.collection('users').doc(req.user.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          resolvedByName = userData.authorName || userData.displayName || userData.name || userData.username || userData.fullName;
          if (userData.email) {
            resolvedByEmail = userData.email;
          }
        }
      } catch (err) {
        console.error('[updatePost] Error fetching buyer user from DB:', err.message);
      }
    }

    // Fallback to email prefix or Unknown if name is still missing
    if (!resolvedByName || resolvedByName === 'Unknown' || resolvedByName === 'Student') {
      resolvedByName = resolvedByEmail ? resolvedByEmail.split('@')[0] : 'Unknown';
    }

    updates.reservedBy = resolvedBy;
    updates.reservedByName = resolvedByName;
    updates.reservedByEmail = resolvedByEmail || 'Unknown';
  } else if (status === 'Available') {
    updates.reservedBy = null;
    updates.reservedByName = null;
    updates.reservedByEmail = null;
    updates.soldAt = null;
  } else if (status === 'Sold') {
    updates.soldAt = soldAt || new Date().toISOString();
  } else {
    if (reservedBy !== undefined) updates.reservedBy = reservedBy;
    if (reservedByName !== undefined) updates.reservedByName = reservedByName;
    if (reservedByEmail !== undefined) updates.reservedByEmail = reservedByEmail;
    if (soldAt !== undefined) updates.soldAt = soldAt;
  }



  const oldStatus = post.status || 'Available';
  const newStatus = updates.status;

  await ref.update(updates);

  // Trigger notifications on status transition
  if (newStatus && newStatus !== oldStatus) {
    try {
      // Notify the SELLER
      const sellerNotif = {
        userId: post.author,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        postId: doc.id
      };

      if (newStatus === 'Reserved') {
        const buyerName = updates.reservedByName || req.user.name || 'A student';
        sellerNotif.title = 'Item Reserved';
        sellerNotif.message = `${buyerName} reserved your item '${post.title}'`;
        sellerNotif.type = 'reserve';
        await db.collection('notifications').add(sellerNotif);
      } else if (newStatus === 'Available' && oldStatus === 'Reserved') {
        // Notify seller about cancellation
        sellerNotif.title = 'Reservation Cancelled';
        sellerNotif.message = `The reservation for your item '${post.title}' has been cancelled.`;
        sellerNotif.type = 'cancel_reserve';
        await db.collection('notifications').add(sellerNotif);

        // Notify the BUYER that their reservation was cancelled (if cancelled by seller)
        if (post.reservedBy && post.reservedBy !== req.user.id) {
          await db.collection('notifications').add({
            userId: post.reservedBy,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            postId: doc.id,
            title: 'Reservation Cancelled by Seller',
            message: `The seller cancelled your reservation for '${post.title}'.`,
            type: 'cancel_reserve'
          });
        }
      } else if (newStatus === 'Sold') {
        // Notify seller
        sellerNotif.title = 'Item Marked as Sold';
        sellerNotif.message = `Your item '${post.title}' has been successfully marked as sold.`;
        sellerNotif.type = 'sold';
        await db.collection('notifications').add(sellerNotif);

        // Notify the BUYER that the item has been sold
        if (post.reservedBy && post.reservedBy !== post.author) {
          await db.collection('notifications').add({
            userId: post.reservedBy,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            postId: doc.id,
            title: 'Item Sold',
            message: `The item '${post.title}' you reserved has been marked as sold.`,
            type: 'sold'
          });
        }
      }
    } catch (err) {
      console.error('[updatePost] Error creating notification:', err.message);
    }
  }

  res.json({ id: doc.id, ...post, ...updates });
});

exports.toggleLike = asyncHandler(async (req, res) => {
  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();
  const userId = req.user.id;
  const likedBy = post.likedBy || [];
  const likeIndex = likedBy.indexOf(userId);

  let newLikes = post.likes ?? 0;

  if (likeIndex > -1) {
    likedBy.splice(likeIndex, 1);
    newLikes = Math.max(0, newLikes - 1);
  } else {
    likedBy.push(userId);
    newLikes += 1;
  }

  await ref.update({
    likedBy,
    likes: newLikes,
  });

  res.json({ likes: newLikes, likedBy });
});

exports.toggleSave = asyncHandler(async (req, res) => {
  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();
  const userId = req.user.id;
  const savedBy = post.savedBy || [];
  const saveIndex = savedBy.indexOf(userId);

  if (saveIndex > -1) {
    savedBy.splice(saveIndex, 1);
  } else {
    savedBy.push(userId);
  }

  await ref.update({ savedBy });
  res.json({ savedBy });
});

exports.getSavedPosts = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  console.log(`[Posts] GET /api/posts/saved | user=${userId}`);

  const snapshot = await db.collection('posts').where('savedBy', 'array-contains', userId).get();
  let list = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    list.push({
      id: doc.id,
      ...data,
    });
  });

  // Sort by createdAt descending safely
  list.sort((a, b) => getEpoch(b.createdAt) - getEpoch(a.createdAt));

  // Normalize structure for frontend mapping
  const normalized = list.map((p) => {
    let formattedDate = new Date().toISOString();
    const epoch = getEpoch(p.createdAt);
    if (epoch > 0) {
      formattedDate = new Date(epoch).toISOString();
    }

    return {
      ...p,
      createdAt: formattedDate,
      username: p.authorName || 'User',
      avatar: (p.authorName || 'U').charAt(0).toUpperCase(),
      likes: p.likes ?? 0,
      likedBy: p.likedBy ?? [],
      savedBy: p.savedBy ?? [],
      commentsCount: p.commentsCount ?? 0,
    };
  });

  console.log(`[Posts] Saved → returning ${normalized.length} posts`);
  res.json(normalized);
});

exports.votePoll = asyncHandler(async (req, res) => {
  const { optionIndex } = req.body;

  if (optionIndex === undefined || optionIndex === null) {
    throw new ApiError(400, 'optionIndex is required');
  }
  const idx = parseInt(optionIndex, 10);
  if (isNaN(idx) || idx < 0) {
    throw new ApiError(400, 'optionIndex must be a non-negative integer');
  }

  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();
  if (!post.poll) throw new ApiError(404, 'Poll not found');

  const poll = post.poll;
  const votedBy = poll.votedBy || [];

  if (idx >= poll.options.length) {
    throw new ApiError(400, `optionIndex ${idx} is out of bounds`);
  }

  if (votedBy.includes(req.user.id)) {
    throw new ApiError(400, 'Already voted');
  }

  poll.options[idx].votes = (poll.options[idx].votes ?? 0) + 1;
  votedBy.push(req.user.id);
  poll.votedBy = votedBy;

  await ref.update({ poll });
  res.json(poll);
});

exports.flagPost = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  await ref.update({ isFlagged: true });

  await db.collection('reports').add({
    targetType: 'post',
    targetId: req.params.id,
    reason: reason || 'Community Flag',
    reporter: req.user.id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Post flagged for review' });
});

exports.deletePost = asyncHandler(async (req, res) => {
  const ref = db.collection('posts').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) throw new ApiError(404, 'Post not found');

  const post = doc.data();

  // Only author or admin can delete
  if (post.author !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'Unauthorized');
  }

  await ref.delete();
  res.json({ success: true, message: 'Post deleted' });
});


