import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SubscribeButton } from './SubscribeFlow'

const defaultCreator = {
  id: '',
  username: 'creator.init',
  priceLabel: '15',
  priceWei: '15000000000000000000',
  tierId: 0
}

export function SubscribePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const creator = location.state?.creator || defaultCreator
  const hasCreator = Boolean(location.state?.creator?.id)

  const [selectedToken, setSelectedToken] = useState('INIT')
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    if (!isSuccess || !creator?.id) return

    const timer = window.setTimeout(() => {
      navigate(`/creator/${creator.id}`)
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [creator?.id, isSuccess, navigate])

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <div className="max-w-md rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-12 text-center shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#a7f3d0] text-3xl">
            OK
          </div>
          <h2 className="mb-4 dark:text-white">Subscription Successful!</h2>
          <p className="text-[#6b7280] dark:text-[#9ca3af]">
            You're now subscribed to {creator.username}. Redirecting...
          </p>
        </div>
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
          <span>X</span>
          <span>Cancel</span>
        </button>

        <div className="overflow-hidden rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="border-r border-[rgba(0,0,0,0.08)] bg-gradient-to-br from-[#fafbfc] to-white p-8 dark:border-[rgba(255,255,255,0.1)] dark:from-[#202034] dark:to-[#2a2a3e] md:p-12">
              <h2 className="mb-8 dark:text-white">Payment Method</h2>

              <div className="space-y-4">
                <button className="flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] p-6 shadow-lg" type="button">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/30">
                    W
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
                  type="button"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#2a2a3e]">
                    Card
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#6b7280] dark:text-[#9ca3af]">Credit Card</p>
                    <p className="text-sm text-[#9ca3af]">Coming soon via Stripe</p>
                  </div>
                </button>

                <button
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-4 rounded-2xl bg-[#f3f4f6] p-6 opacity-50 dark:bg-[#1a1a2e]"
                  type="button"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white dark:bg-[#2a2a3e]">
                    UPI
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[#6b7280] dark:text-[#9ca3af]">UPI</p>
                    <p className="text-sm text-[#9ca3af]">Coming soon via Stripe</p>
                  </div>
                </button>
              </div>

              <div className="mt-8 rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-4">
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Currently, only crypto payments are supported. Traditional payment methods are coming soon.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h2 className="mb-8 dark:text-white">Payment Details</h2>

              {!hasCreator ? (
                <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-6">
                  <p className="text-[#6b7280] dark:text-[#9ca3af]">
                    Open this page from a creator profile so we know which subscription tier to charge.
                  </p>
                </div>
              ) : null}

              <div className="mb-8 space-y-6">
                <div>
                  <label className="mb-3 block dark:text-white">Select Token</label>
                  <div className="space-y-3">
                    {['INIT', 'ETH', 'USDC'].map((token) => {
                      const active = selectedToken === token
                      const disabled = token !== 'INIT'

                      return (
                        <button
                          key={token}
                          onClick={() => !disabled && setSelectedToken(token)}
                          disabled={disabled}
                          className={`flex w-full items-center justify-between rounded-2xl p-4 transition-all ${
                            active
                              ? 'border-2 border-[#93c5fd] bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20'
                              : 'border-2 border-transparent bg-[#f9fafb] hover:border-[#e5e7eb] dark:bg-[#1a1a2e]'
                          } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                          type="button"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6ee7b7] to-[#93c5fd] text-sm">
                              {token[0]}
                            </div>
                            <div className="text-left">
                              <p className="dark:text-white">{token}</p>
                              {token === 'INIT' ? (
                                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Recommended</p>
                              ) : null}
                            </div>
                          </div>
                          {active ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#93c5fd]">
                              OK
                            </div>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl bg-[#fafbfc] p-6 dark:bg-[#1a1a2e]">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Subscribing to</span>
                    <span className="dark:text-white">{creator.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Amount</span>
                    <span className="dark:text-white">{creator.priceLabel} INIT/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Platform Fee</span>
                    <span className="text-[#6ee7b7]">$0</span>
                  </div>
                  <div className="flex justify-between border-t border-[rgba(0,0,0,0.08)] pt-3 dark:border-[rgba(255,255,255,0.1)]">
                    <span className="dark:text-white">Total</span>
                    <span className="text-2xl dark:text-white">{creator.priceLabel} INIT</span>
                  </div>
                </div>
              </div>

              {hasCreator ? (
                <SubscribeButton
                  creator={creator.id}
                  tierId={creator.tierId}
                  price={creator.priceWei}
                  buttonLabel="Pay with Wallet"
                  className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-all hover:scale-105 active:scale-95"
                  onSuccess={() => setIsSuccess(true)}
                />
              ) : (
                <button
                  className="w-full cursor-not-allowed rounded-full bg-[#f3f4f6] px-8 py-4 text-[#9ca3af] dark:bg-[#1a1a2e]"
                  type="button"
                  disabled
                >
                  Select a creator first
                </button>
              )}

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
