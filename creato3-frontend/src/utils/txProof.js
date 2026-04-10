import { CHAIN_ID } from '../config/contracts'

const HEX_HASH = /^0x[a-fA-F0-9]{64}$/
const RAW_HASH = /^[A-Fa-f0-9]{64}$/

const DEFAULT_PUBLIC_EXPLORER =
  CHAIN_ID && CHAIN_ID !== 'creato3-1' ? 'https://scan.testnet.initia.xyz/tx/' : ''

const seen = new WeakSet()

const normalizeHash = (value) => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (HEX_HASH.test(trimmed)) return trimmed
  if (RAW_HASH.test(trimmed)) return `0x${trimmed}`
  return ''
}

const walkForHash = (value) => {
  const direct = normalizeHash(value)
  if (direct) return direct

  if (!value || typeof value !== 'object') return ''
  if (seen.has(value)) return ''
  seen.add(value)

  for (const key of [
    'txHash',
    'transactionHash',
    'hash',
    'txhash',
    'transaction_hash',
    'codeHash'
  ]) {
    const hit = normalizeHash(value[key])
    if (hit) return hit
  }

  for (const nested of Object.values(value)) {
    const hit = walkForHash(nested)
    if (hit) return hit
  }

  return ''
}

export const extractTxHash = (result) => {
  seen.clear?.()
  return walkForHash(result)
}

export const getTxExplorerUrl = (hash) => {
  const normalized = normalizeHash(hash)
  if (!normalized) return ''

  const configured = String(import.meta.env.VITE_TX_EXPLORER_BASE_URL || '').trim()
  const base = configured || DEFAULT_PUBLIC_EXPLORER
  if (!base) return ''

  return `${base.replace(/\/+$/, '')}/${normalized}`
}

export const shortTxHash = (hash) => {
  const normalized = normalizeHash(hash)
  if (!normalized) return 'Unavailable'
  return `${normalized.slice(0, 10)}...${normalized.slice(-8)}`
}
