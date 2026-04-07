import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import SUBSCRIPTION_ABI from '../abis/SubscriptionManager.json'
import { CONTRACTS, CHAIN_ID } from '../config/contracts'
import { publicClient } from '../config/evmClient'
import { BridgeButton } from './BridgeButton'
import { useToast } from './ToastProvider'
import { buildMsgCall } from '../utils/msgCall'

export function SubscribeButton({
  creator,
  tierId,
  price,
  onSuccess,
  buttonLabel,
  className = 'glow-btn w-full'
}) {
  const { address, hexAddress, initiaAddress, requestTxSync, autoSign, openConnect } =
    useInterwovenKit()
  const resolvedInitiaAddress = useInitiaAddress() || initiaAddress || ''
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState(null)
  const evmAddress = hexAddress || address
  const autoSignEnabled = Boolean(autoSign?.isEnabledByChain?.[CHAIN_ID])

  const priceBigInt = useMemo(() => {
    try {
      return BigInt(price)
    } catch {
      return 0n
    }
  }, [price])

  const priceLabel = useMemo(() => {
    try {
      return ethers.formatEther(priceBigInt)
    } catch {
      return '0'
    }
  }, [priceBigInt])

  useEffect(() => {
    if (!evmAddress) return
    let active = true

    const fetchBalance = async () => {
      try {
        const value = await publicClient.getBalance({ address: evmAddress })
        if (active) {
          setBalance(value)
        }
      } catch {
        if (active) {
          setBalance(null)
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 15000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [evmAddress])

  const hasEnough = balance !== null && BigInt(balance) >= priceBigInt

  const handleSubscribe = async () => {
    setBusy(true)
    setError('')

    try {
      if (!resolvedInitiaAddress) {
        openConnect?.()
        throw new Error('Connect an Initia wallet before subscribing.')
      }

      const iface = new ethers.Interface(SUBSCRIPTION_ABI)
      const data = iface.encodeFunctionData('subscribe', [creator, tierId])

      const msg = buildMsgCall({
        sender: resolvedInitiaAddress,
        contractAddr: CONTRACTS.subscription,
        input: data,
        value: priceBigInt.toString()
      })

      await requestTxSync({ chainId: CHAIN_ID, messages: [msg] })

      toast.success(
        'Subscribed',
        autoSignEnabled
          ? 'Access granted with one-tap auto-sign.'
          : 'Access granted with zero platform fees.'
      )

      if (typeof onSuccess === 'function') {
        onSuccess()
      }
    } catch (err) {
      const message = err?.message || 'Subscription failed'
      setError(message)
      toast.error('Subscription failed', message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {!address ? (
        <button className={className} onClick={openConnect} type="button">
          Connect Wallet
        </button>
      ) : null}

      {address && !hasEnough ? (
        <div className="space-y-3">
          <BridgeButton requiredAmount={priceLabel} />
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Balance on creato3-1: {balance ? ethers.formatEther(balance) : '0'} INIT
          </p>
        </div>
      ) : null}

      {address && hasEnough ? (
        <>
          <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={autoSignEnabled}
              disabled={autoSign?.isLoading}
              onChange={(event) =>
                event.target.checked
                  ? autoSign.enable(CHAIN_ID)
                  : autoSign.disable(CHAIN_ID)
              }
              className="h-4 w-4 accent-emerald-500"
            />
            One-tap mode (no wallet popup per transaction)
          </label>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Turn this on once and InterwovenKit will handle signing on `creato3-1`.
          </p>
          <button className={className} onClick={handleSubscribe} disabled={busy} type="button">
            {busy ? 'Processing...' : buttonLabel || `Pay ${priceLabel} INIT`}
          </button>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-red-500 dark:text-red-300">{error}</p>
      ) : null}
    </div>
  )
}
