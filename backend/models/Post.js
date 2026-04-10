const mongoose = require('mongoose');

const socialPostSchema = new mongoose.Schema(
  {
    platform: String,
    url: String
  },
  { _id: false }
);

const postSchema = new mongoose.Schema({
  creatorAddress: { type: String, required: true, index: true },
  title: String,
  content: String,
  isPremium: { type: Boolean, default: false },
  platforms: [String],
  socialPosts: [socialPostSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.models.Post || mongoose.model('Post', postSchema);
