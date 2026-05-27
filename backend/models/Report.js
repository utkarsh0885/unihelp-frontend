const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  targetType: {
    type: String,
    enum: ['post', 'user', 'comment'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Report', reportSchema);
