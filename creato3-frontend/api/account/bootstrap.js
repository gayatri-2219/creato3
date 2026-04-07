import { ensureAccountReady } from '../_lib/bootstrap.js'
import { json, readJsonBody } from '../_lib/http.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' })
    return
  }

  try {
    const body = await readJsonBody(req)
    const address = String(body?.address || '').trim()
    const result = await ensureAccountReady(address)
    json(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Automatic account bootstrap failed.'
    const status =
      /valid Initia address/i.test(message)
        ? 400
        : /disabled|required|missing/i.test(message)
          ? 503
          : 500

    json(res, status, { error: message })
  }
}
