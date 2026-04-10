import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createConfig, http, WagmiProvider } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import {
  InterwovenKitProvider,
  TESTNET,
  injectStyles
} from '@initia/interwovenkit-react'
import InterwovenKitStyles from '@initia/interwovenkit-react/styles.js'
import App from './App.jsx'
import {
  AVERAGE_GAS_PRICE,
  CHAIN_ID,
  COSMOS_RPC,
  FIXED_MIN_GAS_PRICE,
  HAS_DEPLOYMENT_ENV_ISSUES,
  INDEXER_URL,
  NATIVE_DENOM,
  NATIVE_NAME,
  NATIVE_SYMBOL,
  HIGH_GAS_PRICE,
  LOW_GAS_PRICE,
  REST_API
} from './config/contracts'
import { DeploymentIssueScreen, StartupErrorBoundary } from './app/components/StartupErrorBoundary.jsx'
import { ThemeProvider } from './shared/ThemeProvider.jsx'
import { ToastProvider } from './shared/ToastProvider.jsx'
import './index.css'

const queryClient = new QueryClient()
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() }
})

const appChainId = CHAIN_ID
const nativeDenom = NATIVE_DENOM
const nativeSymbol = NATIVE_SYMBOL
const nativeName = NATIVE_NAME
const fixedMinGasPrice = FIXED_MIN_GAS_PRICE || (appChainId === 'creato3-1' ? 0 : 150000)
const lowGasPrice = LOW_GAS_PRICE || fixedMinGasPrice
const averageGasPrice = AVERAGE_GAS_PRICE || lowGasPrice
const highGasPrice = HIGH_GAS_PRICE || averageGasPrice
const hasDeploymentEnvIssues = HAS_DEPLOYMENT_ENV_ISSUES

const customChain = {
  chain_id: appChainId,
  chain_name: 'Creato3',
  network_type: 'testnet',
  bech32_prefix: 'init',
  apis: {
    rpc: [{ address: COSMOS_RPC }],
    rest: [{ address: REST_API }],
    indexer: [{ address: INDEXER_URL }]
  },
  fees: {
    fee_tokens: [
      {
        denom: nativeDenom,
        fixed_min_gas_price: fixedMinGasPrice,
        low_gas_price: lowGasPrice,
        average_gas_price: averageGasPrice,
        high_gas_price: highGasPrice
      }
    ]
  },
  staking: { staking_tokens: [{ denom: nativeDenom }] },
  native_assets: [{ denom: nativeDenom, name: nativeName, symbol: nativeSymbol, decimals: 6 }],
  metadata: { is_l1: false, minitia: { type: 'minievmchain' } }
}

injectStyles(InterwovenKitStyles)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StartupErrorBoundary>
      {hasDeploymentEnvIssues ? (
        <DeploymentIssueScreen />
      ) : (
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <ToastProvider>
                <InterwovenKitProvider
                  {...TESTNET}
                  defaultChainId={appChainId}
                  customChain={customChain}
                >
                  <App />
                </InterwovenKitProvider>
              </ToastProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </WagmiProvider>
      )}
    </StartupErrorBoundary>
  </StrictMode>
)
