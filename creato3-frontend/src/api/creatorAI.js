const API_URL = import.meta.env.VITE_ANTHROPIC_API_URL || '/api/claude'
const AI_MODE = import.meta.env.VITE_AI_MODE || 'local'
const MODEL = 'claude-sonnet-4-20250514'

const LM_BASE_URL = import.meta.env.VITE_LMSTUDIO_BASE_URL || '/api/lm'
const LM_MODEL = import.meta.env.VITE_LMSTUDIO_MODEL || ''
const LM_API_KEY = import.meta.env.VITE_LMSTUDIO_API_KEY || ''

const parseJsonPayload = (text) => {
  const cleaned = text.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

const isLocal = () => AI_MODE === 'local' || AI_MODE === 'mock'
const isLMStudio = () => AI_MODE === 'lmstudio'

const formatCurrency = (value) => Math.max(0, Math.round(value || 0))

const localPricing = ({ niche, subscribers, platform }) => {
  const audience = Number(subscribers || 0)
  const base =
    audience > 50000 ? 8 : audience > 20000 ? 6 : audience > 5000 ? 5 : 4
  const tiers = [
    {
      name: 'Starter',
      price_usd: base,
      description: `Entry access for ${niche || 'your'} fans on ${platform || 'social'}.`,
      benefits: ['Weekly posts', 'Behind-the-scenes updates', 'Member-only chat'],
      target_audience: 'Curious supporters'
    },
    {
      name: 'Studio',
      price_usd: base * 3,
      description: 'Core membership with deeper access and feedback.',
      benefits: ['Monthly live session', 'Early releases', 'Direct Q&A'],
      target_audience: 'Engaged regulars'
    },
    {
      name: 'Inner Circle',
      price_usd: base * 7,
      description: 'Premium access and direct collaboration.',
      benefits: ['1:1 feedback slot', 'Private drops', 'Credit shout-outs'],
      target_audience: 'Superfans + collaborators'
    }
  ]

  return {
    tiers,
    reasoning:
      'Prices are tuned for low-friction entry, a strong mid-tier, and a premium offer that anchors value.',
    expected_conversion_pct: '3.5'
  }
}

const localRevenue = ({ tiers = [], subscriberCount, conversionPct }) => {
  const audience = Number(subscriberCount || 0)
  const conv = Number(conversionPct || 0) / 100
  const shares = tiers.length === 3 ? [0.7, 0.2, 0.1] : []
  const totalSubs = audience * conv
  const monthly = tiers.reduce((sum, tier, idx) => {
    const price = Number(tier.price_usd || 0)
    const share = shares[idx] ?? 1 / Math.max(tiers.length, 1)
    return sum + price * totalSubs * share
  }, 0)
  const creato3 = formatCurrency(monthly)
  const patreon = formatCurrency(monthly * 0.9)
  const substack = formatCurrency(monthly * 0.9)
  const annualExtra = formatCurrency((creato3 - patreon) * 12)
  return {
    monthly_creato3: creato3,
    monthly_patreon: patreon,
    monthly_substack: substack,
    annual_extra_creato3: annualExtra,
    key_insight: 'Zero platform fees mean every subscriber has more impact.'
  }
}

const localContent = ({ niche, audience }) => ({
  tiers: [
    {
      name: 'Starter',
      benefits: ['Weekly recap', 'Member-only polls', 'Downloadable templates'],
      why_subscribers_stay: `Consistent value and clarity around ${niche || 'your'} progress.`,
      cadence: '1x weekly'
    },
    {
      name: 'Studio',
      benefits: ['Live critique sessions', 'Monthly roadmap', 'Asset vault'],
      why_subscribers_stay: 'They feel directly involved in the creative journey.',
      cadence: '2x monthly'
    },
    {
      name: 'Inner Circle',
      benefits: ['Private feedback channel', 'Early drops', 'Collab opportunities'],
      why_subscribers_stay: 'High-touch access and direct collaboration.',
      cadence: 'Monthly deep-dive'
    }
  ],
  top_tip: `Your ${audience || 'core'} fans love transparency—share experiments and decision tradeoffs.`
})

async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || data?.error || 'Anthropic request failed'
    throw new Error(message)
  }

  try {
    return parseJsonPayload(data.content[0].text)
  } catch {
    throw new Error('Claude response was not valid JSON')
  }
}

async function resolveLMModel() {
  if (LM_MODEL) return LM_MODEL
  const res = await fetch(`${LM_BASE_URL}/models`)
  const data = await res.json()
  const modelId = data?.data?.[0]?.id
  if (!modelId) {
    throw new Error('LM Studio model not found. Load a model in LM Studio.')
  }
  return modelId
}

async function callLMStudio(prompt) {
  const modelId = await resolveLMModel()
  const headers = {
    'Content-Type': 'application/json'
  }
  if (LM_API_KEY) {
    headers.Authorization = `Bearer ${LM_API_KEY}`
  }

  const res = await fetch(`${LM_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: modelId,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are a JSON-only assistant. Return valid JSON with no extra commentary.'
        },
        { role: 'user', content: prompt }
      ]
    })
  })

  const data = await res.json()
  if (!res.ok) {
    const message = data?.error?.message || 'LM Studio request failed'
    throw new Error(message)
  }

  const text = data?.choices?.[0]?.message?.content
  if (!text) {
    throw new Error('LM Studio returned empty content')
  }

  try {
    return parseJsonPayload(text)
  } catch {
    throw new Error('LM Studio response was not valid JSON')
  }
}

const callLLM = (prompt) => {
  if (isLMStudio()) return callLMStudio(prompt)
  return callClaude(prompt)
}

export const getSmartPricing = ({ niche, subscribers, platform }) =>
  isLocal()
    ? Promise.resolve(localPricing({ niche, subscribers, platform }))
    : callLLM(
        `Creator economy expert. ${niche} creator, ${subscribers} followers on ${platform}.\n` +
          'Recommend 3 tiers. JSON only — no markdown:\n' +
          '{"tiers":[{"name","price_usd","description","benefits":[],"target_audience"}],"reasoning","expected_conversion_pct"}'
      )

export const getRevenuePrediction = ({ tiers, subscriberCount, conversionPct }) =>
  isLocal()
    ? Promise.resolve(localRevenue({ tiers, subscriberCount, conversionPct }))
    : callLLM(
        `Compare monthly earnings. ${subscriberCount} audience, ${conversionPct}% conversion.\n` +
          `Tiers: ${JSON.stringify(tiers)}. Creato3 (0% fee) vs Patreon (10%) vs Substack (10%).\n` +
          'JSON: {"monthly_creato3","monthly_patreon","monthly_substack","annual_extra_creato3","key_insight"}'
      )

export const getContentStrategy = ({ niche, audience }) =>
  isLocal()
    ? Promise.resolve(localContent({ niche, audience }))
    : callLLM(
        `Tier benefits for ${niche} creator targeting ${audience}.\n` +
          'Maximise conversion + retention. JSON: {"tiers":[{"name","benefits":[],"why_subscribers_stay","cadence"}],"top_tip"}'
      )
