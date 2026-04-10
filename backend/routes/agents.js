const express = require('express');
const { ethers } = require('ethers');
const { getProfileContract } = require('../services/contracts');
const CreatorProfileABI = require('../abis/CreatorProfile.json');

const router = express.Router();

const mockAgentDraft = ({ category, goal }) => {
  const niche = String(category || 'creator').trim() || 'creator';
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'creator';
  const displayName = `AI ${niche[0].toUpperCase()}${niche.slice(1)} Agent`;

  return {
    displayName,
    category: niche,
    bio: `I am an AI ${niche} creator agent. I help publish premium updates, plan member drops, and respond to the community with a clear on-chain subscription model.`,
    initUsername: `${slug}agent.init`,
    launchPost: {
      title: `Welcome to ${displayName}`,
      content:
        `I am launching a Creato3 membership focused on ${goal || `${niche} insights, premium drops, and weekly community updates`}. ` +
        'Subscribers get direct access to structured posts, behind-the-scenes decisions, and member-first content.'
    },
    suggestedTier: {
      name: 'Agent Insider',
      priceInit: 4,
      description: 'Premium updates and agent-curated drops',
      features: ['Weekly premium post', 'Content roadmap', 'Community prompts']
    },
    source: 'mock'
  };
};

async function groqAgentDraft(body) {
  const key = process.env.GROQ_API_KEY;
  const fallback = mockAgentDraft(body);
  if (!key) {
    return fallback;
  }

  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: key });
  const chat = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.35,
    messages: [
      {
        role: 'user',
        content: `Design a launch-ready AI creator agent for Creato3.

Category: ${body.category || 'creator'}
Goal: ${body.goal || 'launch a premium creator community'}

Return ONLY valid JSON:
{"displayName":"short name","category":"single category","bio":"2 sentences, first person agent voice","initUsername":"lowercasehandle.init","launchPost":{"title":"string","content":"120-180 words"},"suggestedTier":{"name":"string","priceInit":number,"description":"string","features":["string"]}}`
      }
    ]
  });
  const text = chat.choices[0].message.content;
  const parsed = JSON.parse(String(text).replace(/```json|```/g, '').trim());
  return { ...fallback, ...parsed, source: 'groq' };
}

router.post('/draft', async (req, res) => {
  try {
    const draft = await groqAgentDraft(req.body || {});
    res.json(draft);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { privateKey, displayName, bio, category, initUsername } = req.body;
    if (!privateKey || !displayName || !bio || !category) {
      return res
        .status(400)
        .json({ error: 'privateKey, displayName, bio, and category are required' });
    }

    const rpc = process.env.EVM_RPC;
    const profileAddr = process.env.PROFILE_ADDRESS;
    if (!rpc || !profileAddr) {
      return res.status(503).json({ error: 'EVM_RPC and PROFILE_ADDRESS must be configured' });
    }

    const provider = new ethers.JsonRpcProvider(rpc);
    const wallet = new ethers.Wallet(privateKey, provider);
    const profile = new ethers.Contract(profileAddr, CreatorProfileABI, wallet);

    const username =
      initUsername ||
      `${displayName.toLowerCase().replace(/\s+/g, '')}.init` ;

    const tx = await profile.registerCreator(displayName, bio, category, username);
    const receipt = await tx.wait();

    res.json({
      address: wallet.address,
      txHash: receipt.hash,
      initUsername: username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
