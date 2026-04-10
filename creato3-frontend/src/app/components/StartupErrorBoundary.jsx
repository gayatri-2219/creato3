import { Component } from 'react'
import {
  HAS_DEPLOYMENT_ENV_ISSUES,
  LOCAL_ONLY_PUBLIC_ENV_KEYS,
  MISSING_CONTRACT_ENV_KEYS,
  MISSING_GAS_PRICE_ENV_KEYS,
  MISSING_PUBLIC_ENV_KEYS
} from '../../config/contracts'

export class StartupErrorBoundary extends Component {
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

export function DeploymentIssueScreen({ error = null }) {
  const hasMissingKeys = Boolean(
    MISSING_PUBLIC_ENV_KEYS.length ||
      MISSING_CONTRACT_ENV_KEYS.length ||
      MISSING_GAS_PRICE_ENV_KEYS.length
  )
  const hasLocalUrls = Boolean(LOCAL_ONLY_PUBLIC_ENV_KEYS.length)

  const title = hasMissingKeys
    ? 'Creato3 is missing Vercel environment variables'
    : hasLocalUrls
      ? 'Creato3 is using localhost URLs in production'
      : 'Creato3 failed during startup'

  const description = hasMissingKeys
    ? 'Add the missing public chain and contract values in Vercel, then redeploy.'
    : hasLocalUrls
      ? 'Replace localhost endpoints with public URLs for the same deployed chain before redeploying.'
      : 'Open the browser console or Vercel function logs to inspect the runtime error.'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] px-6 py-16 text-[#1f2937] dark:from-[#1a1a2e] dark:to-[#16213e] dark:text-white">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[rgba(0,0,0,0.08)] bg-white/90 p-8 shadow-2xl backdrop-blur dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]/90">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#6ee7b7]">
          Deployment Check
        </p>
        <h1 className="mb-4 text-4xl">{title}</h1>
        <p className="mb-6 text-base text-[#6b7280] dark:text-[#9ca3af]">{description}</p>

        {hasMissingKeys || hasLocalUrls ? (
          <>
            {hasMissingKeys ? (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-500/10">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Missing variables
                </p>
                <ul className="mt-3 space-y-2 font-mono text-sm text-amber-800 dark:text-amber-100">
                  {MISSING_PUBLIC_ENV_KEYS.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                  {MISSING_CONTRACT_ENV_KEYS.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                  {MISSING_GAS_PRICE_ENV_KEYS.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
                {MISSING_GAS_PRICE_ENV_KEYS.length ? (
                  <p className="mt-3 text-sm text-amber-800 dark:text-amber-100">
                    Public Initia chains reject zero-fee transactions. Set a non-zero gas price for
                    the custom chain before redeploying.
                  </p>
                ) : null}
              </div>
            ) : null}

            {hasLocalUrls ? (
              <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-400/20 dark:bg-amber-500/10">
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Local-only URLs found
                </p>
                <ul className="mt-3 space-y-2 font-mono text-sm text-amber-800 dark:text-amber-100">
                  {LOCAL_ONLY_PUBLIC_ENV_KEYS.map((key) => (
                    <li key={key}>{key}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-amber-800 dark:text-amber-100">
                  Vercel cannot reach your laptop&apos;s blockchain services. Use public Initia or
                  appchain endpoints instead of <span className="font-mono">localhost</span>.
                </p>
              </div>
            ) : null}

            <div className="rounded-3xl bg-[#0f172a] p-5 font-mono text-sm text-slate-100">
              <p>VITE_PROFILE_CONTRACT=0x...</p>
              <p>VITE_SUBSCRIPTION_CONTRACT=0x...</p>
              <p>VITE_TREASURY_CONTRACT=0x...</p>
              <p>VITE_CHAIN_ID=your-public-chain-id</p>
              <p>VITE_EVM_RPC=https://your-public-evm-rpc.example.com</p>
              <p>VITE_COSMOS_RPC=https://your-public-cosmos-rpc.example.com</p>
              <p>VITE_REST_API=https://your-public-rest-api.example.com</p>
              <p>VITE_INDEXER_URL=https://your-public-indexer.example.com</p>
              <p>VITE_NATIVE_DENOM=your-public-fee-denom</p>
              <p>VITE_GAS_PRICE=REPLACE_WITH_PUBLIC_MIN_GAS_PRICE</p>
            </div>

            <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
              Every endpoint above must belong to the same chain as your deployed contracts, and
              `VITE_GAS_PRICE` must be a non-zero value for public chains.
            </p>
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
