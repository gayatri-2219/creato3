import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import SUBSCRIPTION_ABI from '../../abis/SubscriptionManager.json'
import { Skeleton } from '../../shared/Skeleton'
import { CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import {
  capitalize,
  formatInit,
  pickGradient,
  resolveCreatorName,
  shortAddress
} from '../lib/formatters'
import { ClockIcon, RepeatIcon, UsersIcon } from '../components/icons'

export function MySubscriptionsPage() {
  const { hexAddress, openConnect } = useInterwovenKit()
  const [subscriptions, setSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    const loadSubscriptions = async () => {
      if (!hexAddress || !CONTRACTS.profile || !CONTRACTS.subscription) {
        if (active) {
          setSubscriptions([])
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const subscriptionLogs = await publicClient.getLogs({
          address: CONTRACTS.subscription,
          event: SUBSCRIPTION_ABI.find((entry) => entry.name === 'Subscribed'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const creatorAddresses = Array.from(
          new Map(
            subscriptionLogs
              .filter((log) => log.args?.subscriber?.toLowerCase() === hexAddress.toLowerCase())
              .map((log) => [log.args?.creator?.toLowerCase(), log.args?.creator])
          ).values()
        ).filter(Boolean)

        const items = await Promise.all(
          creatorAddresses.map(async (creatorAddress) => {
            const [creator, currentSubscription] = await Promise.all([
              publicClient.readContract({
                address: CONTRACTS.profile,
                abi: CREATOR_PROFILE_ABI,
                functionName: 'getCreator',
                args: [creatorAddress]
              }),
              publicClient.readContract({
                address: CONTRACTS.subscription,
                abi: SUBSCRIPTION_ABI,
                functionName: 'getSubscription',
                args: [hexAddress, creatorAddress]
              })
            ])

            const tier = await publicClient
              .readContract({
                address: CONTRACTS.profile,
                abi: CREATOR_PROFILE_ABI,
                functionName: 'getTier',
                args: [creatorAddress, Number(currentSubscription?.tierId || 0)]
              })
              .catch(() => null)

            const expiryMs = Number(currentSubscription?.expiry || 0) * 1000
            const isActive = Boolean(currentSubscription?.active) && expiryMs > Date.now()

            return {
              address: creatorAddress,
              creator,
              tier,
              isActive,
              expiryMs,
              gradient: pickGradient(creatorAddress)
            }
          })
        )

        if (!active) return

        setSubscriptions(
          items.sort((left, right) => {
            if (left.isActive !== right.isActive) return Number(right.isActive) - Number(left.isActive)
            return right.expiryMs - left.expiryMs
          })
        )
      } catch {
        if (active) {
          setError('Unable to load your subscriptions right now.')
          setSubscriptions([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadSubscriptions()

    return () => {
      active = false
    }
  }, [hexAddress])

  const counts = useMemo(() => {
    const activeCount = subscriptions.filter((item) => item.isActive).length
    return {
      active: activeCount,
      total: subscriptions.length
    }
  }, [subscriptions])

  if (!hexAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <h1 className="mb-4 text-4xl dark:text-white">My Subscriptions</h1>
            <p className="mb-8 text-[#6b7280] dark:text-[#9ca3af]">
              Connect your wallet to see the creators you support and open their premium content.
            </p>
            <button
              className="rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
              onClick={() => openConnect?.()}
              type="button"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-col gap-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-3 text-5xl dark:text-white">My Subscriptions</h1>
            <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
              Track every creator you&apos;ve subscribed to and jump straight into their premium page.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gradient-to-r from-[#a7f3d0]/15 to-[#93c5fd]/15 p-5">
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Active now</p>
              <p className="text-3xl dark:text-white">{counts.active}</p>
            </div>
            <div className="rounded-2xl bg-gradient-to-r from-[#fbcfe8]/15 to-[#ddd6fe]/15 p-5">
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Total joined</p>
              <p className="text-3xl dark:text-white">{counts.total}</p>
            </div>
          </div>
        </div>

        {error ? <div className="mb-8 text-red-500">{error}</div> : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
                >
                  <div className="mb-5 flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="mb-3 h-4 w-full" />
                  <Skeleton className="mb-6 h-4 w-5/6" />
                  <Skeleton className="h-12 w-full rounded-full" />
                </div>
              ))
            : subscriptions.map((item) => {
                const creatorName = resolveCreatorName(item.creator, item.address)
                const priceLabel =
                  item.tier?.price !== undefined ? `${formatInit(item.tier.price)} INIT` : 'Tier available'
                const expiryLabel =
                  item.expiryMs > 0
                    ? new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      }).format(item.expiryMs)
                    : 'Pending'

                return (
                  <div
                    key={item.address}
                    className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
                  >
                    <div className="mb-5 flex items-start gap-4">
                      <div
                        className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-3xl`}
                      >
                        {creatorName.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate dark:text-white">{creatorName}</h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              item.isActive
                                ? 'bg-[#dcfce7] text-[#166534] dark:bg-[#1f3b2b] dark:text-[#86efac]'
                                : 'bg-[#fee2e2] text-[#991b1b] dark:bg-[#3a2024] dark:text-[#fca5a5]'
                            }`}
                          >
                            {item.isActive ? 'Active' : 'Expired'}
                          </span>
                        </div>
                        <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          {capitalize(item.creator?.category) || 'Creator'} · {shortAddress(item.address)}
                        </p>
                      </div>
                    </div>

                    <p className="mb-5 line-clamp-2 leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                      {item.creator?.bio || 'Premium content creator on Creato3.'}
                    </p>

                    <div className="mb-6 space-y-3 rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#1a1a2e]">
                      <div className="flex items-center justify-between text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-2">
                          <RepeatIcon className="h-4 w-4" />
                          Subscription
                        </span>
                        <span className="dark:text-white">{priceLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          Access until
                        </span>
                        <span className="dark:text-white">{expiryLabel}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-2">
                          <UsersIcon className="h-4 w-4" />
                          Content access
                        </span>
                        <span className="dark:text-white">
                          {item.isActive ? 'Unlocked' : 'Renew to unlock'}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/creator/${item.address}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-6 py-3 shadow-md transition-transform hover:scale-105 active:scale-95"
                    >
                      {item.isActive ? 'View Creator Content' : 'Open Creator Page'}
                    </Link>
                  </div>
                )
              })}
        </div>

        {!loading && subscriptions.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="mb-3 dark:text-white">No subscriptions yet</h2>
            <p className="mb-8 text-[#6b7280] dark:text-[#9ca3af]">
              Start following creators and your active subscriptions will show up here.
            </p>
            <Link
              to="/discover"
              className="inline-flex rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              Discover Creators
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}
