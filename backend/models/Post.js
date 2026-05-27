const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['General', 'Buy/Sell', 'Events', 'Lost & Found', 'Notes', 'Other'],
    default: 'General',
  },
  imageUrl: {
    type: String,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  authorName: String, // Denormalized for faster reads
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  savedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  commentsCount: {
    type: Number,
    default: 0,
  },
  isFlagged: {
    type: Boolean,
    default: false,
  },
  price: {
    type: Number, // For Buy/Sell
  },
  condition: String,
  poll: {
    options: [{
      text: String,
      votes: { type: Number, default: 0 }
    }],
    votedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }
}, {
  timestamps: true,
});

// ── Indexes for query performance ─────────────────────────────────────────────
postSchema.index({ createdAt: -1 });                  // Default feed sort
postSchema.index({ category: 1, createdAt: -1 });      // Category-filtered feed
postSchema.index({ author: 1, createdAt: -1 });        // User's own posts

module.exports = mongoose.model('Post', postSchema);
