const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)?/i

const readEnv = (key, devFallback = '') => {
  const value = import.meta.env[key]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return import.meta.env.DEV ? devFallback : ''
}

const readNumberEnv = (key, fallback = 0) => {
  const value = import.meta.env[key]

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim())

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

const DEFAULT_PUBLIC_GAS_PRICE = 150000

const hasNonEmptyValue = (value) => typeof value === 'string' && value.trim().length > 0

const isLocalOnlyUrl = (value) => typeof value === 'string' && LOCALHOST_PATTERN.test(value.trim())

const requiredEndpointEntries = [
  ['VITE_EVM_RPC', import.meta.env.VITE_EVM_RPC],
  ['VITE_COSMOS_RPC', import.meta.env.VITE_COSMOS_RPC],
  ['VITE_REST_API', import.meta.env.VITE_REST_API],
  ['VITE_INDEXER_URL', import.meta.env.VITE_INDEXER_URL]
]

const requiredContractEntries = [
  ['VITE_PROFILE_CONTRACT', import.meta.env.VITE_PROFILE_CONTRACT],
  ['VITE_SUBSCRIPTION_CONTRACT', import.meta.env.VITE_SUBSCRIPTION_CONTRACT],
  ['VITE_TREASURY_CONTRACT', import.meta.env.VITE_TREASURY_CONTRACT]
]

export const CONTRACTS = {
  profile: readEnv('VITE_PROFILE_CONTRACT'),
  subscription: readEnv('VITE_SUBSCRIPTION_CONTRACT'),
  treasury: readEnv('VITE_TREASURY_CONTRACT')
}

export const CHAIN_ID = readEnv('VITE_CHAIN_ID', 'creato3-1') || 'creato3-1'
export const EVM_RPC = readEnv('VITE_EVM_RPC', 'http://localhost:8545')
export const COSMOS_RPC = readEnv('VITE_COSMOS_RPC', 'http://localhost:26657')
export const REST_API = readEnv('VITE_REST_API', 'http://localhost:1317')
export const INDEXER_URL = readEnv('VITE_INDEXER_URL', 'http://localhost:8080')
export const NATIVE_DENOM = readEnv('VITE_NATIVE_DENOM', 'GAS') || 'GAS'
export const NATIVE_SYMBOL = readEnv('VITE_NATIVE_SYMBOL', NATIVE_DENOM) || NATIVE_DENOM
export const NATIVE_NAME = readEnv('VITE_NATIVE_NAME', NATIVE_SYMBOL) || NATIVE_SYMBOL
const defaultGasPrice = CHAIN_ID === 'creato3-1' ? 0 : DEFAULT_PUBLIC_GAS_PRICE
export const GAS_PRICE = readNumberEnv('VITE_GAS_PRICE', defaultGasPrice)
export const FIXED_MIN_GAS_PRICE = readNumberEnv(
  'VITE_FIXED_MIN_GAS_PRICE',
  GAS_PRICE || defaultGasPrice
)
export const LOW_GAS_PRICE = readNumberEnv('VITE_LOW_GAS_PRICE', FIXED_MIN_GAS_PRICE)
export const AVERAGE_GAS_PRICE = readNumberEnv('VITE_AVERAGE_GAS_PRICE', LOW_GAS_PRICE)
export const HIGH_GAS_PRICE = readNumberEnv('VITE_HIGH_GAS_PRICE', AVERAGE_GAS_PRICE)
export const PUBLIC_ENDPOINTS_CONFIGURED = Boolean(EVM_RPC && COSMOS_RPC && REST_API && INDEXER_URL)
export const MISSING_PUBLIC_ENV_KEYS = requiredEndpointEntries
  .filter(([, value]) => !hasNonEmptyValue(value))
  .map(([key]) => key)
export const MISSING_CONTRACT_ENV_KEYS = requiredContractEntries
  .filter(([, value]) => !hasNonEmptyValue(value))
  .map(([key]) => key)
export const LOCAL_ONLY_PUBLIC_ENV_KEYS = import.meta.env.DEV
  ? []
  : requiredEndpointEntries.filter(([, value]) => isLocalOnlyUrl(value)).map(([key]) => key)
export const PUBLIC_CHAIN_REQUIRES_GAS_PRICE = !import.meta.env.DEV && CHAIN_ID !== 'creato3-1'
export const MISSING_GAS_PRICE_ENV_KEYS =
  PUBLIC_CHAIN_REQUIRES_GAS_PRICE && FIXED_MIN_GAS_PRICE <= 0 ? ['VITE_GAS_PRICE'] : []
export const HAS_DEPLOYMENT_ENV_ISSUES = Boolean(
  MISSING_PUBLIC_ENV_KEYS.length ||
    MISSING_CONTRACT_ENV_KEYS.length ||
    LOCAL_ONLY_PUBLIC_ENV_KEYS.length ||
    MISSING_GAS_PRICE_ENV_KEYS.length
)
