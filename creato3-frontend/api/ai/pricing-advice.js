import { clampInit, groqJson, mockPricingAdvice } from '../_lib/ai.js'
import { json, readJsonBody } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const fallback = mockPricingAdvice(body)
    const prompt = `You are pricing a creator subscription on Creato3, an Initia appchain product. Fans pay in INIT tokens, not USD.

Creator context:
- Display name: ${body.displayName || 'unknown'}
- Category: ${body.category || 'general'}
- Bio: ${body.bio || 'n/a'}
- Expected audience / followers: ${body.followers || 0}
- Current platform: ${body.currentPlatform || 'Creato3'}
- Content summary: ${body.contentSummary || 'not provided'}

Return ONLY valid JSON:
{"tiers":[{"name":"string","priceInit":number,"description":"string","features":["string"]}],"recommendedTierIndex":1,"comparison":{"patreon_monthly_loss_usd":number,"creato3_value_note":"short string"},"reasoning":"3-5 sentences","expected_conversion_pct":"string"}

Rules: exactly 3 tiers, monthly INIT prices, realistic 0.5 to 80 INIT for most creators.`

    const data = await groqJson(prompt, fallback)
    const tiers = Array.isArray(data.tiers) ? data.tiers : fallback.tiers
    for (const tier of tiers) {
      if (tier.priceInit == null && tier.price != null) {
        tier.priceInit = Number(tier.price)
      }
      if (typeof tier.priceInit === 'number') {
        tier.priceInit = clampInit(tier.priceInit)
      }
    }

    json(res, 200, {
      ...fallback,
      ...data,
      tiers,
      source: process.env.GROQ_API_KEY ? 'groq' : 'mock'
    })
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Pricing advice failed.'
    })
  }
}
