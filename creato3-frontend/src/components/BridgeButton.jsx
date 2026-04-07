import { useInterwovenKit } from '@initia/interwovenkit-react'
import { CHAIN_ID } from '../config/contracts'

export function BridgeButton({ requiredAmount, onBridgeComplete }) {
  const { address, openBridge } = useInterwovenKit()

  const handleBridge = () => {
    openBridge({
      denoms: ['uinit'],
      chainId: CHAIN_ID
    })
    if (onBridgeComplete) onBridgeComplete()
  }

  if (!address) return null

  return (
    <div className="glass-soft flex flex-col gap-3 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        You need {requiredAmount} INIT to subscribe.
      </p>
      <button className="btn-primary" onClick={handleBridge} type="button">
        Bridge INIT from Initia L1 →
      </button>
      <p className="text-xs text-slate-500 dark:text-slate-400">Arrives in ~30 seconds via Initia IBC</p>
      <p className="rounded-2xl border border-amber-400/30 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-400/10 dark:text-amber-100">
        Local testing note: the Interwoven modal may not list unregistered local chain IDs,
        but the bridge flow should still open.
      </p>
    </div>
  )
}
