const readEnv = (key, devFallback = '') => {
  const value = import.meta.env[key]

  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  return import.meta.env.DEV ? devFallback : ''
}

export const CONTRACTS = {
  profile: import.meta.env.VITE_PROFILE_CONTRACT,
  subscription: import.meta.env.VITE_SUBSCRIPTION_CONTRACT,
  treasury: import.meta.env.VITE_TREASURY_CONTRACT
}

export const CHAIN_ID = readEnv('VITE_CHAIN_ID', 'creato3-1') || 'creato3-1'
export const EVM_RPC = readEnv('VITE_EVM_RPC', 'http://localhost:8545')
export const COSMOS_RPC = readEnv('VITE_COSMOS_RPC', 'http://localhost:26657')
export const REST_API = readEnv('VITE_REST_API', 'http://localhost:1317')
export const INDEXER_URL = readEnv('VITE_INDEXER_URL', 'http://localhost:8080')
export const PUBLIC_ENDPOINTS_CONFIGURED = Boolean(EVM_RPC && COSMOS_RPC && REST_API && INDEXER_URL)
