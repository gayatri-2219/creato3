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
import { CHAIN_ID, COSMOS_RPC, INDEXER_URL, REST_API } from './config/contracts'
import { ThemeProvider } from './components/ThemeProvider.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './index.css'

const queryClient = new QueryClient()
const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: { [mainnet.id]: http() }
})

const appChainId = CHAIN_ID
const nativeDenom = (import.meta.env.VITE_NATIVE_DENOM || 'GAS').trim()
const nativeSymbol = (import.meta.env.VITE_NATIVE_SYMBOL || nativeDenom).trim()
const nativeName = (import.meta.env.VITE_NATIVE_NAME || nativeSymbol).trim()

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
        fixed_min_gas_price: 0,
        low_gas_price: 0,
        average_gas_price: 0,
        high_gas_price: 0
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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <InterwovenKitProvider
              {...TESTNET}
              defaultChainId={appChainId}
              customChain={customChain}
              enableAutoSign
            >
              <App />
            </InterwovenKitProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
)
