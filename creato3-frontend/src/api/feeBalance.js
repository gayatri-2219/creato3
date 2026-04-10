import { NATIVE_DENOM, REST_API } from '../config/contracts'

const parseBalanceAmount = (value) => {
  try {
    return BigInt(String(value || '0'))
  } catch {
    return 0n
  }
}

const trimTrailingSlash = (value) => String(value || '').replace(/\/+$/, '')

export async function fetchNativeFeeBalance(address) {
  const nextAddress = String(address || '').trim()

  if (!nextAddress) {
    throw new Error('Initia address is required before checking fee balance.')
  }

  const restBase = trimTrailingSlash(REST_API)

  if (!restBase) {
    throw new Error('REST API is not configured for fee balance checks.')
  }

  const byDenomUrl = `${restBase}/cosmos/bank/v1beta1/balances/${nextAddress}/by_denom?denom=${encodeURIComponent(NATIVE_DENOM)}`
  const response = await fetch(byDenomUrl)

  if (response.ok) {
    const payload = await response.json().catch(() => ({}))
    return parseBalanceAmount(payload?.balance?.amount)
  }

  if (response.status !== 404) {
    throw new Error(`Fee balance lookup failed with status ${response.status}.`)
  }

  return 0n
}
