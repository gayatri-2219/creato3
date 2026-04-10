const express = require('express');

const router = express.Router();

const stripJsonFence = (text) =>
  String(text || '')
    .replace(/```json|```/g, '')
    .trim();

const mockContentPlan = ({ creatorName, category, platform }) => [
  {
    day: 1,
    title: `Welcome back, ${creatorName || 'creator'}`,
    caption: `Kickoff week with a ${category || 'creator'} insight for ${platform || 'your channel'}.`,
    hashtags: ['#creato3', '#initia'],
    postTime: '10:00'
  },
  {
    day: 2,
    title: 'Behind the scenes',
    caption: 'Share a quick workflow or tool you use.',
    hashtags: ['#bts'],
    postTime: '14:00'
  }
];

const clampInit = (n, min = 0.25, max = 250) =>
  Math.min(max, Math.max(min, Math.round(Number(n) * 100) / 100));

const mockPricingAdviceInit = ({
  category,
  followers,
  currentPlatform,
  contentSummary,
  displayName,
  bio
}) => {
  const n = Number(followers) || 0;
  const blob = `${contentSummary || ''} ${bio || ''}`.toLowerCase();
  const premium =
    /video|course|coaching|exclusive|library|template|mentor|1:1|live|pdf|tutorial/.test(
      blob
    );
  let base = 1.5;
  if (n >= 100000) base = 45;
  else if (n >= 50000) base = 28;
  else if (n >= 10000) base = 15;
  else if (n >= 3000) base = 9;
  else if (n >= 800) base = 6;
  else if (n >= 200) base = 4;
  else if (n >= 50) base = 2.5;
  if (premium) base *= 1.35;
  base = clampInit(base);
  const mid = clampInit(base * 2.1);
  const high = clampInit(base * 4.5);
  const reasoning = [
    displayName ? `Profile: ${displayName}.` : '',
    `Niche ${category || 'general'}, ~${n} expected supporters.`,
    premium
      ? 'Content signals (courses, video, exclusives) justify a higher INIT floor.'
      : 'Smaller catalog signals; kept entry tier approachable on testnet.',
    'Prices are in INIT (Creato3 subscription currency), not USD.'
  ]
    .filter(Boolean)
    .join(' ');

  return {
    tiers: [
      {
        name: 'Supporter',
        priceInit: base,
        description: 'Community access and core drops',
        features: ['Updates', 'Discord / community', 'Early announcements']
      },
      {
        name: 'Member',
        priceInit: mid,
        description: 'Full premium library',
        features: ['All supporter perks', 'Full asset access', 'Monthly recap']
      },
      {
        name: 'Inner circle',
        priceInit: high,
        description: 'Highest touch',
        features: ['Everything in Member', 'Priority feedback', 'Credits / shout-outs']
      }
    ],
    recommendedTierIndex: 1,
    comparison: {
      patreon_monthly_loss_usd: Math.round(n * 0.09),
      creato3_value_note: 'On-chain subscriptions settle in INIT with zero platform fee.'
    },
    reasoning,
    expected_conversion_pct: String(Math.min(8, 2.2 + Math.min(4, n / 4000))),
    source: 'mock',
    note:
      process.env.GROQ_API_KEY
        ? undefined
        : 'Set GROQ_API_KEY on the server for LLM-generated pricing from your content summary.'
  };
};

async function groqChat(messages) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return null;
  }
  const Groq = require('groq-sdk');
  const groq = new Groq({ apiKey: key });
  return groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages
  });
}

router.post('/content-plan', async (req, res) => {
  const { creatorName, category, platform, instructions } = req.body;
  try {
    const chat = await groqChat([
      {
        role: 'user',
        content:
          `You are a content strategist for ${creatorName}, a ${category} creator.\n` +
          `Generate a 7-day content plan for ${platform || 'social'}.\n` +
          `Extra instructions: ${instructions || 'none'}.\n` +
          'Return ONLY valid JSON array: [{day, title, caption, hashtags, postTime}]'
      }
    ]);

    if (!chat) {
      return res.json(mockContentPlan({ creatorName, category, platform }));
    }

    const text = chat.choices[0].message.content;
    const json = JSON.parse(stripJsonFence(text));
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pricing-advice', async (req, res) => {
  const {
    category,
    followers,
    currentPlatform,
    contentSummary,
    displayName,
    bio
  } = req.body;

  const prompt = `You are pricing a creator subscription on Creato3 (Initia appchain). Fans pay in INIT tokens (native on this minitia), NOT USD.

Creator context:
- Display name: ${displayName || 'unknown'}
- Category / niche: ${category || 'general'}
- Bio: ${bio || 'n/a'}
- Expected audience / followers: ${followers}
- Primary platform / context: ${currentPlatform || 'Creato3'}
- Content & offering summary (files, deliverables, pitch): ${contentSummary || 'not provided'}

Return ONLY valid JSON (no markdown fences):
{
  "tiers": [
    {"name": "string", "priceInit": number, "description": "string", "features": ["string"]}
  ],
  "recommendedTierIndex": 1,
  "comparison": {
    "patreon_monthly_loss_usd": number,
    "creato3_value_note": "short string"
  },
  "reasoning": "3-5 sentences: tie INIT prices to the described content, audience size, and perceived exclusivity.",
  "expected_conversion_pct": "string e.g. 3.5"
}

Rules:
- Exactly 3 tiers (entry / mid / premium).
- priceInit = monthly price in INIT (typical testnet range ~0.5–80; go higher only if audience is very large and offer is premium).
- Do not output USD tier prices; only priceInit.
- If content summary is thin, say so in reasoning and stay conservative.`;

  try {
    const chat = await groqChat([{ role: 'user', content: prompt }]);

    if (!chat) {
      return res.json(
        mockPricingAdviceInit({
          category,
          followers,
          currentPlatform,
          contentSummary,
          displayName,
          bio
        })
      );
    }

    const text = chat.choices[0].message.content;
    const json = JSON.parse(stripJsonFence(text));
    const tiers = Array.isArray(json.tiers) ? json.tiers : [];
    for (const t of tiers) {
      if (t.priceInit == null && t.price != null) {
        t.priceInit = Number(t.price);
      }
      if (typeof t.priceInit === 'number') {
        t.priceInit = clampInit(t.priceInit);
      }
    }
    json.source = 'groq';
    res.json(json);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
