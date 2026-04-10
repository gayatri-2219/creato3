const BOOTSTRAP_URL = import.meta.env.VITE_BOOTSTRAP_API_URL || '/api/account/bootstrap'

export const isMissingAccountSequenceError = (error) => {
  const message = error?.message || ''

  return (
    /does not exist on chain/i.test(message) ||
    /before trying to query sequence/i.test(message) ||
    /account .* not found/i.test(message)
  )
}

export const isInsufficientFeeError = (error) => {
  const message = error?.message || ''

  return /insufficient fee/i.test(message) || /insufficient fees/i.test(message)
}

export const isBootstrapUnavailableError = (error) => {
  const message = error?.message || ''

  return (
    /bootstrap is disabled/i.test(message) ||
    /required when bootstrap/i.test(message) ||
    /missing required server environment variable/i.test(message) ||
    /remote bootstrap backend failed/i.test(message) ||
    /method not allowed/i.test(message) ||
    /sponsor wallet .* only has/i.test(message) ||
    /could not choose a sponsor denom/i.test(message)
  )
}

export const isRetryableBootstrapError = (error) =>
  isMissingAccountSequenceError(error) || isInsufficientFeeError(error)

export async function ensureAppChainAccount(address) {
  const nextAddress = (address || '').trim()

  if (!nextAddress) {
    throw new Error('Initia address is required before bootstrapping the appchain account.')
  }

  const response = await fetch(BOOTSTRAP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: nextAddress })
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || 'Automatic account bootstrap failed.')
  }

  return payload
}
