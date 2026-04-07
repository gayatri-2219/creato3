import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ethers } from 'ethers'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../abis/CreatorProfile.json'
import SUBSCRIPTION_ABI from '../abis/SubscriptionManager.json'
import { CONTRACTS } from '../config/contracts'
import { publicClient } from '../config/evmClient'
import { Skeleton } from './Skeleton'
import { getCreatorContent } from '../utils/contentStore'
import { getSubscriptionConfig } from '../utils/subscriptionStore'

const short = (value) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''

const formatInit = (value) => {
  try {
    return ethers.formatEther(value)
  } catch {
    return '0'
  }
}

const previewMeta = (item) => {
  if (item.type === 'video') return { icon: 'VID', label: 'Video Content' }
  if (item.type === 'image') return { icon: 'IMG', label: 'Image' }
  if (item.type === 'pdf') return { icon: 'PDF', label: 'Document' }
  if (item.type === 'doc') return { icon: 'DOC', label: 'Document' }
  if (item.type === 'text') return { icon: 'TXT', label: 'Text' }
  return { icon: 'PRE', label: 'Premium Content' }
}

export function CreatorProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const creatorAddress = id || ''
  const { hexAddress } = useInterwovenKit()

  const [creator, setCreator] = useState(null)
  const [tiers, setTiers] = useState([])
  const [tierIds, setTierIds] = useState([])
  const [selectedTierId, setSelectedTierId] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [contentItems, setContentItems] = useState([])
  const [launchConfig, setLaunchConfig] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!creatorAddress) return
    let active = true

    const load = async () => {
      try {
        setLoading(true)

        const creatorData = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'getCreator',
          args: [creatorAddress]
        })

        const [tierList, ids] = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'getActiveTiers',
          args: [creatorAddress]
        })

        const subLogs = await publicClient.getLogs({
          address: CONTRACTS.subscription,
          event: SUBSCRIPTION_ABI.find((entry) => entry.name === 'Subscribed'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        if (!active) return

        setCreator(creatorData)
        setTiers(tierList || [])
        setTierIds(ids || [])
        setSubscriberCount(
          subLogs.filter(
            (log) => log.args?.creator?.toLowerCase() === creatorAddress.toLowerCase()
          ).length
        )

        if (hexAddress) {
          const sub = await publicClient.readContract({
            address: CONTRACTS.subscription,
            abi: SUBSCRIPTION_ABI,
            functionName: 'getSubscription',
            args: [hexAddress, creatorAddress]
          })

          if (active) {
            setSubscription(sub)
          }
        }

        setContentItems(getCreatorContent(creatorAddress))
        setLaunchConfig(getSubscriptionConfig(creatorAddress))
      } catch (loadError) {
        if (active) {
          setError('Unable to load creator')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [creatorAddress, hexAddress])

  const displayTierIds = useMemo(() => {
    if (tierIds.length) return tierIds.map((entry) => Number(entry))
    if (launchConfig?.price) return [0]
    return []
  }, [launchConfig?.price, tierIds])

  const displayTiers = useMemo(() => {
    if (tiers.length) return tiers
    if (!launchConfig?.price) return []

    try {
      return [
        {
          name: 'Premium',
          price: ethers.parseEther(String(launchConfig.price)),
          description: creator?.bio || 'Full access to premium content.',
          active: true
        }
      ]
    } catch {
      return []
    }
  }, [creator?.bio, launchConfig?.price, tiers])

  useEffect(() => {
    if (!displayTierIds.length) return
    if (selectedTierId === null) {
      setSelectedTierId(displayTierIds[0])
    }
  }, [displayTierIds, selectedTierId])

  const selectedTierIndex = Math.max(
    displayTierIds.findIndex((entry) => Number(entry) === Number(selectedTierId)),
    0
  )
  const selectedTier = displayTiers[selectedTierIndex] || displayTiers[0] || null
  const selectedTierLabel = selectedTier ? formatInit(selectedTier.price) : '0'
  const selectedTierIdValue = displayTierIds[selectedTierIndex] ?? 0
  const isActiveSubscription =
    subscription?.active && Number(subscription?.expiry || 0) * 1000 > Date.now()
  const creatorLinks = Object.entries(launchConfig?.links || {}).filter(([, value]) => value)

  const publishedContent = useMemo(() => {
    const uploaded = (launchConfig?.uploads || []).map((file) => ({
      id: file.id,
      title: file.name,
      type: file.category,
      preview: file.preview
    }))

    const saved = contentItems
      .filter((item) => item.published !== false)
      .map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        preview: item.fileDataUrl || item.url || '',
        summary: item.summary
      }))

    return [...uploaded, ...saved]
  }, [contentItems, launchConfig?.uploads])

  const handleSubscribe = () => {
    if (!selectedTier) return

    navigate('/subscribe', {
      state: {
        creator: {
          id: creatorAddress,
          username:
            creator?.initUsername || creator?.displayName || short(creatorAddress),
          priceLabel: selectedTierLabel,
          priceWei: selectedTier.price.toString(),
          tierId: selectedTierIdValue
        }
      }
    })
  }

  if (!creatorAddress) {
    return <div className="mx-auto max-w-4xl px-6 py-10">Creator address missing.</div>
  }

  if (error) {
    return <div className="mx-auto max-w-4xl px-6 py-10 text-red-500">{error}</div>
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 pb-20 pt-24">
        <div className="mb-12 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] md:p-12">
          <div className="flex flex-col gap-8 md:flex-row">
            <Skeleton className="h-32 w-32 rounded-full" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-5 w-40 rounded-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="mb-6 h-10 w-56" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
                >
                  <Skeleton className="mb-4 h-48 w-full rounded-xl" />
                  <Skeleton className="mb-2 h-6 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <Skeleton className="mb-6 h-10 w-40" />
              <Skeleton className="mb-8 h-28 w-full rounded-2xl" />
              <Skeleton className="mb-4 h-4 w-full" />
              <Skeleton className="mb-4 h-4 w-5/6" />
              <Skeleton className="mb-4 h-4 w-4/6" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-7xl px-6">
        {isActiveSubscription ? (
          <div className="mb-8 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-5 dark:border-[rgba(255,255,255,0.1)]">
            <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">You are subscribed</p>
            <p className="text-lg dark:text-white">
              Tier {subscription?.tierId} active until{' '}
              {new Date(Number(subscription?.expiry || 0) * 1000).toLocaleDateString()}
            </p>
          </div>
        ) : null}

        <div className="mb-12 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] md:p-12">
          <div className="flex flex-col items-start gap-8 md:flex-row">
            <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fbcfe8] to-[#ddd6fe] text-6xl">
              {(creator?.displayName || 'C').slice(0, 1)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <h1 className="dark:text-white">
                  {creator?.initUsername || creator?.displayName || short(creatorAddress)}
                </h1>
                <span className="rounded-full bg-[#f3f4f6] px-4 py-2 text-sm text-[#6b7280] dark:bg-[#1a1a2e] dark:text-[#9ca3af]">
                  {creator?.category || 'Creator'}
                </span>
              </div>

              <p className="mb-6 text-[#6b7280] dark:text-[#9ca3af]">
                {creator?.bio || 'Creator profile on Creato3.'}
              </p>

              <div className="mb-6 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2 text-[#6b7280] dark:text-[#9ca3af]">
                  <span>Users</span>
                  <span>{subscriberCount.toLocaleString()} subscribers</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {creatorLinks.map(([key, value]) => (
                  <a
                    key={key}
                    href={String(value)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-4 py-2 transition-transform hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  >
                    {key}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <h2 className="mb-6 dark:text-white">Content Preview</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {publishedContent.map((item) => {
                const meta = previewMeta(item)

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
                  >
                    <div className="mb-4 flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#f3f4f6] to-[#e5e7eb] text-4xl dark:from-[#1a1a2e] dark:to-[#202034]">
                      {item.preview && item.type === 'image' ? (
                        <img
                          src={item.preview}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="dark:text-white">{meta.icon}</span>
                      )}
                    </div>
                    <h3 className="mb-2 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      {meta.label}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-8 text-center dark:border-[rgba(255,255,255,0.1)]">
              <p className="mb-2 text-lg text-[#6b7280] dark:text-[#9ca3af]">
                Subscribe to unlock all content and support this creator
              </p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <h2 className="mb-6 dark:text-white">Subscribe</h2>

              {displayTiers.length > 1 ? (
                <div className="mb-6 flex flex-wrap gap-2">
                  {displayTiers.map((tier, index) => {
                    const active = Number(displayTierIds[index]) === Number(selectedTierIdValue)
                    return (
                      <button
                        key={`${displayTierIds[index]}-${tier.name}`}
                        onClick={() => setSelectedTierId(Number(displayTierIds[index]))}
                        className={`rounded-full px-4 py-2 text-sm transition-all ${
                          active
                            ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] text-[#1f2937]'
                            : 'bg-[#f3f4f6] text-[#6b7280] dark:bg-[#1a1a2e] dark:text-[#9ca3af]'
                        }`}
                        type="button"
                      >
                        {tier.name}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-6">
                <p className="mb-2 text-4xl dark:text-white">{selectedTierLabel} INIT</p>
                <p className="text-[#6b7280] dark:text-[#9ca3af]">per month</p>
              </div>

              <div className="mb-8 space-y-4">
                {[
                  selectedTier?.description || 'Access to all exclusive content',
                  'Join private community channels',
                  'Early access to new releases',
                  'Cancel anytime, no commitments'
                ].map((line) => (
                  <div key={line} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#a7f3d0] text-xs">
                      OK
                    </div>
                    <p className="text-[#6b7280] dark:text-[#9ca3af]">{line}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSubscribe}
                className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-all hover:scale-105 active:scale-95"
                type="button"
              >
                {isActiveSubscription ? 'Manage Subscription' : 'Subscribe Now'}
              </button>

              <p className="mt-4 text-center text-sm text-[#6b7280] dark:text-[#9ca3af]">
                100% goes to the creator. No platform fees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
