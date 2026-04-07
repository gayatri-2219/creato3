import { Buffer } from 'node:buffer'

export const json = (res, status, payload) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export const readJsonBody = async (req) => {
  if (req.body && typeof req.body === 'object') {
    return req.body
  }

  if (typeof req.body === 'string' && req.body.trim()) {
    return JSON.parse(req.body)
  }

  const chunks = []

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export const getRequiredEnv = (name) => {
  const value = process.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  throw new Error(`Missing required server environment variable: ${name}`)
}

export const getOptionalEnv = (name, fallback = '') => {
  const value = process.env[name]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return fallback
}

