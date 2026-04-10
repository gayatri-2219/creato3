const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const stripJsonFence = (text) =>
  String(text || '')
    .replace(/```json|```/g, '')
    .trim()

export const clampInit = (n, min = 0.25, max = 250) =>
  Math.min(max, Math.max(min, Math.round(Number(n) * 100) / 100))

export const parseJsonPayload = (text) => JSON.parse(stripJsonFence(text))

export async function groqJson(prompt, fallback) {
  const key = process.env.GROQ_API_KEY

  if (!key) {
    return fallback
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.35,
      messages: [
        {
          role: 'system',
          content: 'Return only valid JSON. Do not include markdown fences or commentary.'
        },
        { role: 'user', content: prompt }
      ]
    })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Groq request failed (${response.status})`)
  }

  const text = payload?.choices?.[0]?.message?.content

  if (!text) {
    throw new Error('Groq returned an empty response.')
  }

  return parseJsonPayload(text)
}

export function mockContentPlan({ creatorName, category, platform, instructions }) {
  const niche = category || 'creator'
  const channel = platform || 'Creato3'
  const focus = instructions || 'premium community launch'

  return [
    {
      day: 1,
      title: `${creatorName || 'Creator'} launch note`,
      caption: `Announce the ${focus} and invite early supporters on ${channel}.`,
      hashtags: ['#creato3', '#initia'],
      postTime: '10:00'
    },
    {
      day: 2,
      title: 'Behind the scenes',
      caption: `Share one specific ${niche} workflow that paid members will see first.`,
      hashtags: ['#creator', '#community'],
      postTime: '14:00'
    },
    {
      day: 3,
      title: 'Member-only preview',
      caption: 'Tease the first premium drop and explain what subscribers unlock.',
      hashtags: ['#membership', '#onchain'],
      postTime: '11:30'
    },
    {
      day: 4,
      title: 'Proof of value',
      caption: 'Post one concrete win, template, clip, or insight from the paid tier.',
      hashtags: ['#buildinpublic'],
      postTime: '16:00'
    },
    {
      day: 5,
      title: 'Ask the audience',
      caption: 'Run a poll asking fans which premium topic should come next.',
      hashtags: ['#community'],
      postTime: '12:00'
    },
    {
      day: 6,
      title: 'Subscriber spotlight',
      caption: 'Thank early supporters and remind fans that revenue goes directly to the creator.',
      hashtags: ['#zerofee'],
      postTime: '15:00'
    },
    {
      day: 7,
      title: 'Weekly recap',
      caption: 'Summarize what free fans saw and what subscribers unlocked.',
      hashtags: ['#creators'],
      postTime: '10:30'
    }
  ]
}

export function mockPricingAdvice({
  category,
  followers,
  currentPlatform,
  contentSummary,
  displayName,
  bio
}) {
  const n = Number(followers) || 0
  const blob = `${contentSummary || ''} ${bio || ''}`.toLowerCase()
  const premium = /video|course|coaching|exclusive|library|template|mentor|1:1|live|pdf|tutorial/.test(
    blob
  )

  let base = 1.5
  if (n >= 100000) base = 45
  else if (n >= 50000) base = 28
  else if (n >= 10000) base = 15
  else if (n >= 3000) base = 9
  else if (n >= 800) base = 6
  else if (n >= 200) base = 4
  else if (n >= 50) base = 2.5
  if (premium) base *= 1.35

  base = clampInit(base)
  const mid = clampInit(base * 2.1)
  const high = clampInit(base * 4.5)

  return {
    tiers: [
      {
        name: 'Supporter',
        priceInit: base,
        description: 'Community access and core updates',
        features: ['Weekly updates', 'Community chat', 'Early announcements']
      },
      {
        name: 'Member',
        priceInit: mid,
        description: 'Full premium library access',
        features: ['All supporter perks', 'Premium drops', 'Monthly recap']
      },
      {
        name: 'Inner circle',
        priceInit: high,
        description: 'Highest-touch access',
        features: ['Everything in Member', 'Priority feedback', 'Credits or shout-outs']
      }
    ],
    recommendedTierIndex: 1,
    comparison: {
      patreon_monthly_loss_usd: Math.round(n * 0.09),
      creato3_value_note: 'Creato3 keeps subscriptions in INIT with zero platform fee.'
    },
    reasoning: [
      displayName ? `Profile: ${displayName}.` : '',
      `Niche ${category || 'general'}, ~${n} expected supporters on ${currentPlatform || 'Creato3'}.`,
      premium
        ? 'Premium content signals justify a higher entry price.'
        : 'The offer is early, so the entry tier stays approachable.',
      'Prices are monthly INIT amounts, not USD.'
    ]
      .filter(Boolean)
      .join(' '),
    expected_conversion_pct: String(Math.min(8, 2.2 + Math.min(4, n / 4000))),
    source: 'mock'
  }
}

export function mockAgentDraft({ category, goal }) {
  const niche = String(category || 'creator').trim() || 'creator'
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'creator'
  const displayName = `AI ${niche[0].toUpperCase()}${niche.slice(1)} Agent`

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
    contentPlan: mockContentPlan({
      creatorName: displayName,
      category: niche,
      platform: 'Creato3',
      instructions: goal
    }),
    source: 'mock'
  }
}
