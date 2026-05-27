const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
  },
  itemTitle: String,
  itemPrice: Number,
  itemImage: String,
  lastMessage: {
    text: String,
    senderId: mongoose.Schema.Types.ObjectId,
    timestamp: Date,
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  }
}, {
  timestamps: true,
});

// Ensure a chat only exists once between specific users for a specific post (if applicable)
chatSchema.index({ participantIds: 1, postId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
