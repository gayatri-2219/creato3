import { groqJson, mockAgentDraft } from '../_lib/ai.js'
import { json, readJsonBody } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const fallback = mockAgentDraft(body)
    const prompt = `Design a launch-ready AI creator agent for Creato3.

Context:
- Category: ${body.category || 'creator'}
- Goal: ${body.goal || 'launch a premium creator community'}

Return ONLY valid JSON:
{
  "displayName": "short name",
  "category": "single category",
  "bio": "2 sentences, first person agent voice",
  "initUsername": "lowercasehandle.init",
  "launchPost": {"title": "string", "content": "120-180 words"},
  "suggestedTier": {"name": "string", "priceInit": number, "description": "string", "features": ["string"]},
  "contentPlan": [{"day": 1, "title": "string", "caption": "string", "hashtags": ["string"], "postTime": "HH:mm"}]
}`

    const data = await groqJson(prompt, fallback)
    json(res, 200, {
      ...fallback,
      ...data,
      source: process.env.GROQ_API_KEY ? 'groq' : 'mock'
    })
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Agent draft failed.'
    })
  }
}
