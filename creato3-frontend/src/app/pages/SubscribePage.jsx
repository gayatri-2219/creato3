import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { motion as Motion } from 'framer-motion'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import SUBSCRIPTION_ABI from '../../abis/SubscriptionManager.json'
import { useToast } from '../../components/ToastProvider'
import { CHAIN_ID, CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { executeWithAccountBootstrap } from '../../utils/accountBootstrap'
import { buildMsgCall } from '../../utils/msgCall'
import {
  CheckIcon,
  CreditCardIcon,
  SmartphoneIcon,
  WalletIcon,
  XIcon
} from '../components/icons'

const tokenOptions = ['INIT', 'ETH', 'USDC']

const defaultCreator = {
  id: '',
  username: 'creator.init',
  price: '15',
  priceLabel: '15 INIT',
  priceWei: ethers.parseEther('15').toString(),
  tierId: 0,
  subscription: null
}

export function SubscribePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { hexAddress, openBridge, openConnect, requestTxSync, initiaAddress } = useInterwovenKit()
  const resolvedInitiaAddress = (useInitiaAddress() || initiaAddress || '').trim()

  const creator = location.state?.creator || defaultCreator

  const [selectedToken, setSelectedToken] = useState('INIT')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [balance, setBalance] = useState(null)

  const priceWei = useMemo(() => {
    try {
      return BigInt(creator.priceWei || ethers.parseEther(String(creator.price || 0)).toString())
    } catch {
      return 0n
    }
  }, [creator.price, creator.priceWei])

  const currentPriceLabel = creator.priceLabel || `${creator.price || '0'} INIT`
  const hasEnough = selectedToken === 'INIT' && balance !== null && BigInt(balance) >= priceWei

  useEffect(() => {
    if (!isSuccess || !creator.id) return undefined

    const timer = window.setTimeout(() => {
      navigate(`/creator/${creator.id}`)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [creator.id, isSuccess, navigate])

  useEffect(() => {
    const address = hexAddress || location.state?.viewerAddress
    if (!address) return
    let active = true

    const fetchBalance = async () => {
      try {
        const value = await publicClient.getBalance({ address })
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
    const interval = window.setInterval(fetchBalance, 15000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [hexAddress, location.state?.viewerAddress])

  const handleBridge = () => {
    openBridge?.({
      denoms: ['uinit'],
      chainId: CHAIN_ID
    })
  }

  const handlePayment = async () => {
    if (selectedToken !== 'INIT') {
      toast.error('Coming soon', 'Only INIT payments are wired on-chain right now.')
      return
    }

    if (!resolvedInitiaAddress) {
      openConnect?.()
      toast.error('Connect wallet', 'Connect your Initia wallet before subscribing.')
      return
    }

    if (!creator.id) {
      toast.error('Creator missing', 'Go back and open the creator profile again.')
      return
    }

    setIsProcessing(true)

    try {
      const iface = new ethers.Interface(SUBSCRIPTION_ABI)
      const shouldRenew =
        Boolean(creator.subscription?.active) && Number(creator.subscription?.expiry || 0) > 0
      const data = shouldRenew
        ? iface.encodeFunctionData('renewSubscription', [creator.id])
        : iface.encodeFunctionData('subscribe', [creator.id, Number(creator.tierId || 0)])

      const msg = buildMsgCall({
        sender: resolvedInitiaAddress,
        contractAddr: CONTRACTS.subscription,
        input: data,
        value: priceWei.toString()
      })

      await executeWithAccountBootstrap({
        initiaAddress: resolvedInitiaAddress,
        toast,
        execute: () => requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
      })

      toast.success(
        shouldRenew ? 'Subscription renewed' : 'Subscription successful',
        `You're now subscribed to ${creator.username}.`
      )
      setIsSuccess(true)
    } catch (error) {
      toast.error('Payment failed', error?.message || 'Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-[#fafbfc] pt-24 pb-20 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <Motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="max-w-md rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-12 text-center shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#a7f3d0]">
            <CheckIcon className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-4 dark:text-white">Subscription Successful!</h2>
          <p className="text-[#6b7280] dark:text-[#9ca3af]">
            You&apos;re now subscribed to {creator.username}. Redirecting...
          </p>
        </Motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-5xl px-6">
        <button
          onClick={() => navigate(-1)}
          className="mb-8 flex items-center gap-2 text-[#6b7280] transition-colors hover:text-[#1f2937] dark:text-[#9ca3af] dark:hover:text-white"
          type="button"
        >
          <XIcon className="h-5 w-5" />
          Cancel
        </button>

        <div className="overflow-hidden rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-r border-[rgba(0,0,0,0.08)] bg-gradient-to-br from-[#fafbfc] to-white p-8 md:p-12 dark:border-[rgba(255,255,255,0.1)] dark:from-[#202034] dark:to-[#2a2a3e]">
              <h2 className="mb-8 dark:text-white">Payment Method</h2>

              <div className="space-y-4">
                <button className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] p-6 shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30">
                    <WalletIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p>Crypto / Wallet</p>
                    <p className="text-sm opacity-80">Pay with Web3 wallet</p>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
                    <div className="h-3 w-3 rounded-full bg-[#1f2937]" />
                  </div>
                </button>

                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl bg-[#f3f4f6] p-6 opacity-50 dark:bg-[#1a1a2e]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#2a2a3e]">
                    <CreditCardIcon className="h-6 w-6 text-[#6b7280]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#6b7280] dark:text-[#9ca3af]">Credit Card</p>
                    <p className="text-sm text-[#9ca3af]">Coming soon via Stripe</p>
                  </div>
                </button>

                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl bg-[#f3f4f6] p-6 opacity-50 dark:bg-[#1a1a2e]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#2a2a3e]">
                    <SmartphoneIcon className="h-6 w-6 text-[#6b7280]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#6b7280] dark:text-[#9ca3af]">UPI</p>
                    <p className="text-sm text-[#9ca3af]">Coming soon via Stripe</p>
                  </div>
                </button>
              </div>

              <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-4">
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Currently, only crypto payments are supported. Traditional payment methods are
                  coming soon.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h2 className="mb-8 dark:text-white">Payment Details</h2>

              <div className="mb-8 space-y-6">
                <div>
                  <label className="mb-3 block dark:text-white">Select Token</label>
                  <div className="space-y-3">
                    {tokenOptions.map((token) => (
                      <button
                        key={token}
                        onClick={() => setSelectedToken(token)}
                        className={`w-full rounded-2xl p-4 transition-all ${
                          selectedToken === token
                            ? 'border-2 border-[#93c5fd] bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20'
                            : 'border-2 border-transparent bg-[#f9fafb] hover:border-[#e5e7eb] dark:bg-[#1a1a2e]'
                        }`}
                        type="button"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6ee7b7] to-[#93c5fd] text-sm">
                              {token[0]}
                            </div>
                            <div className="text-left">
                              <p className="dark:text-white">{token}</p>
                              {token === 'INIT' ? (
                                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Recommended</p>
                              ) : (
                                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Coming soon</p>
                              )}
                            </div>
                          </div>
                          {selectedToken === token ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#93c5fd]">
                              <CheckIcon className="h-4 w-4" />
                            </div>
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-[#fafbfc] p-6 dark:bg-[#1a1a2e]">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Subscribing to</span>
                    <span className="dark:text-white">{creator.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Amount</span>
                    <span className="dark:text-white">{currentPriceLabel}/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Platform Fee</span>
                    <span className="text-[#6ee7b7]">$0</span>
                  </div>
                  <div className="flex justify-between border-t border-[rgba(0,0,0,0.08)] pt-3 dark:border-[rgba(255,255,255,0.1)]">
                    <span className="dark:text-white">Total</span>
                    <span className="text-2xl dark:text-white">{currentPriceLabel}</span>
                  </div>
                </div>

                {selectedToken !== 'INIT' ? (
                  <div className="rounded-2xl bg-gradient-to-r from-[#fbcfe8]/20 to-[#ddd6fe]/20 p-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Only INIT is wired to the blockchain checkout right now.
                  </div>
                ) : null}

                {selectedToken === 'INIT' && balance !== null && !hasEnough ? (
                  <div className="rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-4">
                    <p className="mb-3 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      You need {currentPriceLabel} to subscribe. Current balance:{' '}
                      {ethers.formatEther(balance)} INIT
                    </p>
                    <button
                      className="rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-3 transition-transform hover:scale-105 active:scale-95"
                      onClick={handleBridge}
                      type="button"
                    >
                      Bridge INIT from Initia L1
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing || selectedToken !== 'INIT' || (selectedToken === 'INIT' && balance !== null && !hasEnough)}
                className={`w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-all ${
                  isProcessing
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:scale-105 active:scale-95'
                } disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100`}
                type="button"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </span>
                ) : (
                  'Pay with Wallet'
                )}
              </button>

              <p className="mt-4 text-center text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Secure payment powered by blockchain
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
