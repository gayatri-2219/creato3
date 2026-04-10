const express = require('express');
const { ethers } = require('ethers');
const Post = require('../models/Post');
const { postToAllPlatforms } = require('../services/socialPost');

const router = express.Router();

router.post('/social-post', async (req, res) => {
  try {
    const { content, platforms } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }
    const results = await postToAllPlatforms(content, platforms || ['twitter']);
    res.json({
      platforms: results.map((r) => r.platform),
      results
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { creatorAddress, title, content, isPremium, platforms } = req.body;
    if (!creatorAddress || !title) {
      return res.status(400).json({ error: 'creatorAddress and title are required' });
    }

    const normalized = ethers.getAddress(creatorAddress).toLowerCase();
    let socialPosts = [];

    const platformList = Array.isArray(platforms) ? platforms : ['creato3'];
    if (platformList.includes('twitter')) {
      const summary = `${title}\n\n${String(content || '').substring(0, 200)}`;
      socialPosts = await postToAllPlatforms(summary, ['twitter']);
    }

    const post = await Post.create({
      creatorAddress: normalized,
      title,
      content: content || '',
      isPremium: Boolean(isPremium),
      platforms: platformList.length ? platformList : ['creato3'],
      socialPosts
    });

    res.json({ postId: post._id, socialPosts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:creatorAddress', async (req, res) => {
  try {
    const addr = ethers.getAddress(req.params.creatorAddress).toLowerCase();
    const posts = await Post.find({ creatorAddress: addr })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
