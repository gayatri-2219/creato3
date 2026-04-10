import { groqJson, mockContentPlan } from '../_lib/ai.js'
import { json, readJsonBody } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const fallback = mockContentPlan(body)
    const prompt =
      `Generate a 7-day content plan for ${body.creatorName || 'a Creato3 creator'}, ` +
      `a ${body.category || 'creator'} creator on ${body.platform || 'Creato3'}.\n` +
      `Extra instructions: ${body.instructions || 'premium membership launch'}.\n` +
      'Return ONLY valid JSON array: [{"day":1,"title":"string","caption":"string","hashtags":["string"],"postTime":"HH:mm"}]'

    const data = await groqJson(prompt, fallback)
    json(res, 200, Array.isArray(data) ? data : fallback)
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Content plan failed.'
    })
  }
}
