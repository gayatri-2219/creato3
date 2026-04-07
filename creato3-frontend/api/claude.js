import { getRequiredEnv, json, readJsonBody } from './_lib/http.js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const apiKey = getRequiredEnv('ANTHROPIC_API_KEY')
    const payload = await readJsonBody(req)

    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    })

    const text = await response.text()
    res.statusCode = response.status
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')
    res.end(text)
  } catch (error) {
    json(res, 500, {
      error: error instanceof Error ? error.message : 'Claude request failed.'
    })
  }
}

