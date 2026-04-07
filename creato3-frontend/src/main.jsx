import { Component, StrictMode } from 'react'
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
  CHAIN_ID,
  COSMOS_RPC,
  INDEXER_URL,
  MISSING_PUBLIC_ENV_KEYS,
  REST_API
} from './config/contracts'
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
const missingPublicEnvKeys = MISSING_PUBLIC_ENV_KEYS

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

class StartupErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <DeploymentIssueScreen error={this.state.error} />
    }

    return this.props.children
  }
}

function DeploymentIssueScreen({ error = null }) {
  const title = missingPublicEnvKeys.length
    ? 'Creato3 is missing Vercel environment variables'
    : 'Creato3 failed during startup'

  const description = missingPublicEnvKeys.length
    ? 'Add the missing public chain endpoints in Vercel, then redeploy.'
    : 'Open the browser console or Vercel function logs to inspect the runtime error.'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] px-6 py-16 text-[#1f2937] dark:from-[#1a1a2e] dark:to-[#16213e] dark:text-white">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[rgba(0,0,0,0.08)] bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]/90">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#6ee7b7]">
          Deployment Check
        </p>
        <h1 className="mb-4 text-4xl">{title}</h1>
        <p className="mb-6 text-base text-[#6b7280] dark:text-[#9ca3af]">{description}</p>

        {missingPublicEnvKeys.length ? (
          <>
            <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-500/10">
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Missing variables
              </p>
              <ul className="mt-3 space-y-2 font-mono text-sm text-amber-800 dark:text-amber-100">
                {missingPublicEnvKeys.map((key) => (
                  <li key={key}>{key}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl bg-[#0f172a] p-5 font-mono text-sm text-slate-100">
              <p>VITE_EVM_RPC=https://your-public-evm-rpc.example.com</p>
              <p>VITE_COSMOS_RPC=https://your-public-cosmos-rpc.example.com</p>
              <p>VITE_REST_API=https://your-public-rest-api.example.com</p>
              <p>VITE_INDEXER_URL=https://your-public-indexer.example.com</p>
            </div>
          </>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="font-medium text-rose-900 dark:text-rose-200">Runtime error</p>
            <p className="mt-2 font-mono text-sm text-rose-800 dark:text-rose-100">
              {error.message || 'Unknown startup error'}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <StartupErrorBoundary>
      {missingPublicEnvKeys.length ? (
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
                  enableAutoSign
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
