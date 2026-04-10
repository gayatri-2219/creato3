const API_URL = import.meta.env.VITE_ANTHROPIC_API_URL || '/api/claude'
const AI_MODE = import.meta.env.VITE_AI_MODE || 'local'
const MODEL = 'claude-sonnet-4-20250514'

const LM_BASE_URL = import.meta.env.VITE_LMSTUDIO_BASE_URL || '/api/lm'
const LM_MODEL = import.meta.env.VITE_LMSTUDIO_MODEL || ''
const LM_API_KEY = import.meta.env.VITE_LMSTUDIO_API_KEY || ''

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

const parseJsonPayload = (text) => {
  const cleaned = String(text || '')
    .replace(/```json|```/g, '')
    .trim()
  return JSON.parse(cleaned)
}

const isLocal = () => AI_MODE === 'local' || AI_MODE === 'mock'
const isLMStudio = () => AI_MODE === 'lmstudio'

const clampInit = (n, min = 0.25, max = 250) =>
  Math.min(max, Math.max(min, Math.round(Number(n) * 100) / 100))

/** Same shape as backend /api/ai/pricing-advice (INIT tiers). */
const localPricingInit = ({
  niche,
  subscribers,
  platform,
  contentSummary,
  displayName,
  bio
}) => {
  const n = Number(subscribers) || 0
  const blob = `${contentSummary || ''} ${bio || ''}`.toLowerCase()
  const premium =
    /video|course|coaching|exclusive|library|template|mentor|1:1|live|pdf|tutorial/.test(blob)

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

  const reasoning = [
    displayName ? `Creator: ${displayName}.` : '',
    `Category ${niche || 'general'}, ~${n} expected supporters on ${platform || 'Creato3'}.`,
    premium
      ? 'Detected premium-style offerings in your summary — bumped INIT floor.'
      : 'Conservative entry tier for early traction on chain.',
    'Figures are INIT per month (on-chain subscription), not dollars.'
  ]
    .filter(Boolean)
    .join(' ')

  return {
    tiers: [
      {
        name: 'Supporter',
        priceInit: base,
        description: 'Entry tier — updates and community',
        features: ['Weekly updates', 'Member chat', 'Behind-the-scenes']
      },
      {
        name: 'Member',
        priceInit: mid,
        description: 'Full library access',
        features: ['All supporter perks', 'Premium files', 'Monthly recap']
      },
      {
        name: 'Inner circle',
        priceInit: high,
        description: 'Top tier access',
        features: ['Everything in Member', 'Priority Q&A', 'Credits']
      }
    ],
    recommendedTierIndex: 1,
    comparison: {
      patreon_monthly_loss_usd: Math.round(n * 0.09),
      creato3_value_note: 'Creato3 keeps subscriptions in INIT with zero platform fee.'
    },
    reasoning,
    expected_conversion_pct: String(Math.min(8, 2.2 + Math.min(4, n / 4000))),
    source: 'local'
  }
}

const formatCurrency = (value) => Math.max(0, Math.round(value || 0))

const localRevenue = ({ tiers = [], subscriberCount, conversionPct }) => {
  const audience = Number(subscriberCount || 0)
  const conv = Number(conversionPct || 0) / 100
  const shares = tiers.length === 3 ? [0.7, 0.2, 0.1] : []
  const totalSubs = audience * conv
  const monthly = tiers.reduce((sum, tier, idx) => {
    const price = Number(tier.price_usd || tier.priceInit || 0)
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

async function fetchBackendPricingAdvice(body) {
  const res = await fetch(`${BACKEND_URL}/api/ai/pricing-advice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `Pricing API failed (${res.status})`)
  }
  return data
}

async function callClaude(prompt) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
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

const cloudPricingPrompt = (params) => {
  const {
    niche,
    subscribers,
    platform,
    contentSummary,
    displayName,
    bio
  } = params
  return `Creato3 on Initia: subscriptions are priced in INIT (on-chain), not USD.

Creator: ${displayName || 'unknown'}
Niche: ${niche || 'general'}
Bio: ${bio || 'n/a'}
Expected supporters: ${subscribers}
Context: ${platform || 'Creato3'}
Content / offering summary: ${contentSummary || 'not provided'}

Return ONLY JSON:
{"tiers":[{"name","priceInit","description","features":[]}],"recommendedTierIndex":1,"comparison":{"patreon_monthly_loss_usd","creato3_value_note"},"reasoning","expected_conversion_pct"}

priceInit = monthly INIT amount (realistic 0.5–80 for most testnet creators). Exactly 3 tiers.`
}

const normalizeGroqTiers = (json) => {
  const tiers = Array.isArray(json.tiers) ? json.tiers : []
  for (const t of tiers) {
    if (t.priceInit == null && t.price != null) {
      t.priceInit = Number(t.price)
    }
    if (typeof t.priceInit === 'number') {
      t.priceInit = clampInit(t.priceInit)
    }
  }
  return { ...json, tiers, source: json.source || 'cloud' }
}

export const getSmartPricing = async (params) => {
  if (BACKEND_URL) {
    try {
      const data = await fetchBackendPricingAdvice({
        category: params.niche,
        followers: params.subscribers,
        currentPlatform: params.platform,
        contentSummary: params.contentSummary,
        displayName: params.displayName,
        bio: params.bio
      })
      return data
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[Creato3 AI] Backend pricing failed, falling back:', err.message)
      }
    }
  }

  if (!isLocal()) {
    const raw = await callLLM(cloudPricingPrompt(params))
    return normalizeGroqTiers(raw)
  }

  return localPricingInit(params)
}

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
