import { COSMOS_RPC, EVM_RPC, REST_API } from '../config/contracts'
import { publicClient } from '../config/evmClient'

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i

const withTimeout = async (task, timeoutMs = 4000) => {
  return await Promise.race([
    task(),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timed out')), timeoutMs)
    })
  ])
}

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.json().catch(() => null)
}

const getErrorMessage = (error) => {
  if (!error) return 'Unreachable'
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string') return error
  return 'Unreachable'
}

const probeEndpoint = async (label, url, task) => {
  try {
    await withTimeout(task)
    return { label, url, ok: true, error: '' }
  } catch (error) {
    return { label, url, ok: false, error: getErrorMessage(error) }
  }
}

export const probeChainHealth = async () => {
  const results = await Promise.all([
    probeEndpoint('EVM RPC', EVM_RPC, () => publicClient.getBlockNumber()),
    probeEndpoint('Cosmos RPC', COSMOS_RPC, () => fetchJson(`${COSMOS_RPC.replace(/\/$/, '')}/status`)),
    probeEndpoint('REST API', REST_API, () =>
      fetchJson(`${REST_API.replace(/\/$/, '')}/cosmos/base/tendermint/v1beta1/syncing`)
    )
  ])

  return {
    ok: results.every((result) => result.ok),
    results
  }
}

export const summarizeChainHealth = (health) => {
  const failed = health?.results?.filter((result) => !result.ok) || []

  if (!failed.length) {
    return ''
  }

  const labels = failed.map((result) => `${result.label} (${result.url})`).join(', ')
  const localHint = failed.some((result) => LOCALHOST_PATTERN.test(result.url))
    ? 'Start your local rollup services or update the .env endpoints.'
    : 'Check the configured endpoints and make sure they are reachable from the browser.'

  return `Creato3 cannot reach ${labels}. ${localHint}`
}

export const formatChainError = (error, health, actionLabel = 'complete this action') => {
  const message =
    error?.shortMessage ||
    error?.message ||
    (typeof error === 'string' ? error : '')

  if (/empty address string is not allowed/i.test(message)) {
    return 'The transaction payload is missing a valid Initia or contract address. Refresh the app after updating your contract config, then reconnect your wallet.'
  }

  if (/Failed to fetch/i.test(message) || /fetch failed/i.test(message)) {
    return summarizeChainHealth(health) || `Network request failed while trying to ${actionLabel}.`
  }

  return message || `Unable to ${actionLabel}.`
}
