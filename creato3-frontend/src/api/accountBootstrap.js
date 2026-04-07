const BOOTSTRAP_URL = import.meta.env.VITE_BOOTSTRAP_API_URL || '/api/account/bootstrap'

export const isMissingAccountSequenceError = (error) => {
  const message = error?.message || ''

  return (
    /does not exist on chain/i.test(message) ||
    /before trying to query sequence/i.test(message) ||
    /account .* not found/i.test(message)
  )
}

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
