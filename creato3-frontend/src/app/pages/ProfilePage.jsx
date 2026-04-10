import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import CREATOR_TREASURY_ABI from '../../abis/CreatorTreasury.json'
import SUBSCRIPTION_ABI from '../../abis/SubscriptionManager.json'
import { Skeleton } from '../../shared/Skeleton'
import { useToast } from '../../shared/toast'
import { CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { getCreatorContent } from '../../utils/contentStore'
import {
  defaultProfilePreferences,
  getProfilePreferences,
  saveProfilePreferences
} from '../../utils/profileStore'
import { getSubscriptionConfig } from '../../utils/subscriptionStore'
import { getUsernameOverride } from '../../utils/usernameStore'
import {
  capitalize,
  creatorGradients,
  formatInit,
  pickGradient,
  resolveCreatorName,
  shortAddress
} from '../lib/formatters'
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  DollarSignIcon,
  RepeatIcon,
  SparklesIcon,
  TrendingUpIcon,
  UploadIcon,
  UserCircleIcon,
  UsersIcon,
  WalletIcon,
  XIcon
} from '../components/icons'

const PROFILE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'studio', label: 'Creator Studio' }
]

const EMOJI_AVATARS = ['👩‍🎨', '🧑‍🚀', '🎮', '🎤', '📚']

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
})

const compactMonthFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short'
})

const defaultCreatorInsights = {
  lifetimeMembers: 0,
  activeMembers: 0,
  renewals: 0,
  expiringSoon: 0,
  totalEarned: '0',
  monthlyRecurringRevenue: '0',
  renewalRate: 0,
  contentCount: 0,
  contentMix: [],
  activityData: [],
  recentActivity: [],
  transactionStatements: []
}

const buildInitials = (value) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return 'C'

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('')
}

const readFileAsDataUrl = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read file'))
    reader.readAsDataURL(file)
  })

const monthKeyFor = (timestampMs) => {
  const date = new Date(timestampMs)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const buildActivityBuckets = (events, blockTimestampByNumber) => {
  const now = new Date()
  const buckets = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
    return {
      key: monthKeyFor(date.getTime()),
      label: compactMonthFormatter.format(date),
      joins: 0,
      renewals: 0
    }
  })

  const bucketMap = new Map(buckets.map((entry) => [entry.key, entry]))

  events.forEach((event) => {
    const timestampMs = blockTimestampByNumber.get(String(event.blockNumber || ''))
    if (!timestampMs) return

    const bucket = bucketMap.get(monthKeyFor(timestampMs))
    if (!bucket) return

    if (event.type === 'renewal') {
      bucket.renewals += 1
      return
    }

    bucket.joins += 1
  })

  return buckets
}

const buildContentMix = (uploads, contentItems) => {
  const counts = {
    Images: 0,
    Videos: 0,
    Documents: 0,
    Posts: 0,
    Links: 0
  }

  uploads.forEach((file) => {
    if (file.category === 'image') counts.Images += 1
    else if (file.category === 'video') counts.Videos += 1
    else counts.Documents += 1
  })

  contentItems
    .filter((item) => item.published !== false)
    .forEach((item) => {
      if (item.type === 'image') counts.Images += 1
      else if (item.type === 'video') counts.Videos += 1
      else if (item.type === 'pdf') counts.Documents += 1
      else if (item.type === 'link') counts.Links += 1
      else counts.Posts += 1
    })

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .filter((entry) => entry.count > 0)
}

const shortHash = (value) => {
  if (!value) return 'Pending'
  return `${value.slice(0, 10)}...${value.slice(-8)}`
}

const buildTransactionStatements = (paymentLogs, withdrawalLogs, blockTimestampByNumber) =>
  [
    ...paymentLogs.map((log) => ({
      id: `payment-${log.transactionHash || ''}-${String(log.logIndex || 0)}`,
      type: 'Subscription payment',
      amount: `${formatInit(log.args?.amount || 0n)} INIT`,
      transactionHash: log.transactionHash || '',
      blockNumber: log.blockNumber,
      tone: 'green'
    })),
    ...withdrawalLogs.map((log) => ({
      id: `withdrawal-${log.transactionHash || ''}-${String(log.logIndex || 0)}`,
      type: 'Creator withdrawal',
      amount: `${formatInit(log.args?.amount || 0n)} INIT`,
      transactionHash: log.transactionHash || '',
      blockNumber: log.blockNumber,
      tone: 'blue'
    }))
  ]
    .map((entry) => ({
      ...entry,
      timestampMs: blockTimestampByNumber.get(String(entry.blockNumber || '')) || null
    }))
    .sort((left, right) => Number(right.timestampMs || 0) - Number(left.timestampMs || 0))
    .slice(0, 8)

function MetricCard({ icon, label, value, hint, tone = 'green' }) {
  const Icon = icon
  const toneClass =
    tone === 'pink'
      ? 'from-[#fbcfe8]/20 to-[#ddd6fe]/20 text-[#c084fc]'
      : tone === 'blue'
        ? 'from-[#93c5fd]/20 to-[#bfdbfe]/20 text-[#60a5fa]'
        : 'from-[#a7f3d0]/20 to-[#93c5fd]/20 text-[#34d399]'

  return (
    <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClass}`}
        >
          <Icon className="h-6 w-6" />
        </div>
        <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{label}</p>
      </div>
      <p className="mb-2 text-3xl dark:text-white">{value}</p>
      <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">{hint}</p>
    </div>
  )
}

function SummaryStatRow({ label, value }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-[rgba(0,0,0,0.06)] pb-4 last:border-b-0 last:pb-0 dark:border-[rgba(255,255,255,0.08)]">
      <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">{label}</p>
      <p className="text-right text-4xl dark:text-white">{value}</p>
    </div>
  )
}

export function ProfilePage() {
  const toast = useToast()
  const { address, hexAddress, initiaAddress, username, openConnect, openWallet } =
    useInterwovenKit()
  const evmAddress = hexAddress || address || ''
  const profileKey = (initiaAddress || evmAddress || '').trim()
  const usernameOverride = getUsernameOverride(profileKey || address)

  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isCreator, setIsCreator] = useState(false)
  const [creator, setCreator] = useState(null)
  const [profileForm, setProfileForm] = useState(defaultProfilePreferences)
  const [subscriptionItems, setSubscriptionItems] = useState([])
  const [creatorInsights, setCreatorInsights] = useState(defaultCreatorInsights)

  useEffect(() => {
    if (!profileKey) {
      setProfileForm(defaultProfilePreferences)
      return
    }

    setProfileForm(getProfilePreferences(profileKey))
  }, [profileKey])

  useEffect(() => {
    let active = true

    const loadProfile = async () => {
      if (!evmAddress || !CONTRACTS.profile || !CONTRACTS.subscription) {
        if (active) {
          setCreator(null)
          setIsCreator(false)
          setSubscriptionItems([])
          setCreatorInsights(defaultCreatorInsights)
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setError('')

        const subscribedEvent = SUBSCRIPTION_ABI.find((entry) => entry.name === 'Subscribed')
        const renewedEvent = SUBSCRIPTION_ABI.find((entry) => entry.name === 'Renewed')
        const paymentReceivedEvent = CREATOR_TREASURY_ABI.find(
          (entry) => entry.name === 'PaymentReceived'
        )
        const withdrawalEvent = CREATOR_TREASURY_ABI.find(
          (entry) => entry.name === 'Withdrawal'
        )

        const [viewerLogs, registered] = await Promise.all([
          publicClient
            .getLogs({
              address: CONTRACTS.subscription,
              event: subscribedEvent,
              args: { subscriber: evmAddress },
              fromBlock: 0n,
              toBlock: 'latest'
            })
            .catch(() => []),
          publicClient
            .readContract({
              address: CONTRACTS.profile,
              abi: CREATOR_PROFILE_ABI,
              functionName: 'isRegistered',
              args: [evmAddress]
            })
            .catch(() => false)
        ])

        const uniqueCreatorAddresses = Array.from(
          new Map(
            viewerLogs.map((log) => [log.args?.creator?.toLowerCase(), log.args?.creator])
          ).values()
        ).filter(Boolean)

        const nextSubscriptions = await Promise.all(
          uniqueCreatorAddresses.map(async (creatorAddress) => {
            const [creatorData, subscription] = await Promise.all([
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
                args: [evmAddress, creatorAddress]
              })
            ])

            const tier = await publicClient
              .readContract({
                address: CONTRACTS.profile,
                abi: CREATOR_PROFILE_ABI,
                functionName: 'getTier',
                args: [creatorAddress, Number(subscription?.tierId || 0)]
              })
              .catch(() => null)

            const expiryMs = Number(subscription?.expiry || 0) * 1000

            return {
              address: creatorAddress,
              creator: creatorData,
              subscription,
              tier,
              expiryMs,
              isActive: Boolean(subscription?.active) && expiryMs > Date.now(),
              gradient: pickGradient(creatorAddress)
            }
          })
        )

        let nextCreator = null
        let nextInsights = defaultCreatorInsights

        if (registered) {
          const [
            creatorData,
            tierResponse,
            totalEarned,
            creatorLogs,
            renewalLogs,
            paymentLogs,
            withdrawalLogs
          ] =
            await Promise.all([
              publicClient.readContract({
                address: CONTRACTS.profile,
                abi: CREATOR_PROFILE_ABI,
                functionName: 'getCreator',
                args: [evmAddress]
              }),
              publicClient.readContract({
                address: CONTRACTS.profile,
                abi: CREATOR_PROFILE_ABI,
                functionName: 'getActiveTiers',
                args: [evmAddress]
              }),
              CONTRACTS.treasury
                ? publicClient.readContract({
                    address: CONTRACTS.treasury,
                    abi: CREATOR_TREASURY_ABI,
                    functionName: 'getTotalEarned',
                    args: [evmAddress]
                  })
                : 0n,
              publicClient
                .getLogs({
                  address: CONTRACTS.subscription,
                  event: subscribedEvent,
                  args: { creator: evmAddress },
                  fromBlock: 0n,
                  toBlock: 'latest'
                })
                .catch(() => []),
              publicClient
                .getLogs({
                  address: CONTRACTS.subscription,
                  event: renewedEvent,
                  args: { creator: evmAddress },
                  fromBlock: 0n,
                  toBlock: 'latest'
                })
                .catch(() => []),
              CONTRACTS.treasury && paymentReceivedEvent
                ? publicClient
                    .getLogs({
                      address: CONTRACTS.treasury,
                      event: paymentReceivedEvent,
                      args: { creator: evmAddress },
                      fromBlock: 0n,
                      toBlock: 'latest'
                    })
                    .catch(() => [])
                : [],
              CONTRACTS.treasury && withdrawalEvent
                ? publicClient
                    .getLogs({
                      address: CONTRACTS.treasury,
                      event: withdrawalEvent,
                      args: { creator: evmAddress },
                      fromBlock: 0n,
                      toBlock: 'latest'
                    })
                    .catch(() => [])
                : []
            ])

          const [activeTiers, activeTierIds] = tierResponse || [[], []]
          const uniqueSubscriberAddresses = Array.from(
            new Map(
              creatorLogs.map((log) => [log.args?.subscriber?.toLowerCase(), log.args?.subscriber])
            ).values()
          ).filter(Boolean)

          const currentSubscriptions = (
            await Promise.all(
              uniqueSubscriberAddresses.map(async (subscriber) => {
                const value = await publicClient
                  .readContract({
                    address: CONTRACTS.subscription,
                    abi: SUBSCRIPTION_ABI,
                    functionName: 'getSubscription',
                    args: [subscriber, evmAddress]
                  })
                  .catch(() => null)

                return value ? { ...value, subscriber } : null
              })
            )
          ).filter(Boolean)

          const activeSubscriptions = currentSubscriptions.filter(
            (entry) => Boolean(entry.active) && Number(entry.expiry || 0) * 1000 > Date.now()
          )

          const expiringSoonCount = activeSubscriptions.filter((entry) => {
            const expiryMs = Number(entry.expiry || 0) * 1000
            return (
              expiryMs > Date.now() && expiryMs <= Date.now() + 7 * 24 * 60 * 60 * 1000
            )
          }).length

          const tierMap = new Map(
            (activeTierIds || []).map((tierId, index) => [Number(tierId), activeTiers?.[index]])
          )

          const missingTierIds = [
            ...new Set(activeSubscriptions.map((entry) => Number(entry.tierId || 0)))
          ].filter((tierId) => !tierMap.has(tierId))

          const missingTiers = await Promise.all(
            missingTierIds.map(async (tierId) => {
              const value = await publicClient
                .readContract({
                  address: CONTRACTS.profile,
                  abi: CREATOR_PROFILE_ABI,
                  functionName: 'getTier',
                  args: [evmAddress, tierId]
                })
                .catch(() => null)

              return [tierId, value]
            })
          )

          missingTiers.forEach(([tierId, tier]) => {
            if (tier) tierMap.set(Number(tierId), tier)
          })

          const monthlyRecurringRevenue = activeSubscriptions.reduce((sum, entry) => {
            const tier = tierMap.get(Number(entry.tierId || 0))
            try {
              return sum + BigInt(tier?.price || 0)
            } catch {
              return sum
            }
          }, 0n)

          const uploads = getSubscriptionConfig(evmAddress)?.uploads || []
          const contentItems = getCreatorContent(evmAddress)

          const activityLogs = [
            ...creatorLogs.map((log) => ({
              type: 'join',
              wallet: log.args?.subscriber,
              blockNumber: log.blockNumber
            })),
            ...renewalLogs.map((log) => ({
              type: 'renewal',
              wallet: log.args?.subscriber,
              blockNumber: log.blockNumber
            }))
          ]

          const uniqueBlocks = [
            ...new Set(
              [...activityLogs, ...paymentLogs, ...withdrawalLogs]
                .map((entry) => entry.blockNumber)
                .filter(Boolean)
                .map(String)
            )
          ]

          const blockTimestampEntries = await Promise.all(
            uniqueBlocks.map(async (blockNumber) => {
              const block = await publicClient
                .getBlock({ blockNumber: BigInt(blockNumber) })
                .catch(() => null)
              return [blockNumber, block ? Number(block.timestamp) * 1000 : null]
            })
          )

          const blockTimestampByNumber = new Map(blockTimestampEntries)

          const recentActivity = activityLogs
            .map((entry) => ({
              ...entry,
              timestampMs: blockTimestampByNumber.get(String(entry.blockNumber || '')) || null
            }))
            .filter((entry) => entry.timestampMs)
            .sort((left, right) => Number(right.timestampMs) - Number(left.timestampMs))
            .slice(0, 6)

          const transactionStatements = buildTransactionStatements(
            paymentLogs,
            withdrawalLogs,
            blockTimestampByNumber
          )

          nextCreator = creatorData
          nextInsights = {
            lifetimeMembers: uniqueSubscriberAddresses.length,
            activeMembers: activeSubscriptions.length,
            renewals: renewalLogs.length,
            expiringSoon: expiringSoonCount,
            totalEarned: formatInit(totalEarned),
            monthlyRecurringRevenue: formatInit(monthlyRecurringRevenue),
            renewalRate: uniqueSubscriberAddresses.length
              ? Math.round((renewalLogs.length / uniqueSubscriberAddresses.length) * 100)
              : 0,
            contentCount:
              uploads.length + contentItems.filter((item) => item.published !== false).length,
            contentMix: buildContentMix(uploads, contentItems),
            activityData: buildActivityBuckets(activityLogs, blockTimestampByNumber),
            recentActivity,
            transactionStatements
          }
        }

        if (!active) return

        setIsCreator(Boolean(registered))
        setCreator(nextCreator)
        setSubscriptionItems(
          nextSubscriptions.sort((left, right) => {
            if (left.isActive !== right.isActive) {
              return Number(right.isActive) - Number(left.isActive)
            }
            return right.expiryMs - left.expiryMs
          })
        )
        setCreatorInsights(nextInsights)
      } catch {
        if (active) {
          setError('Unable to load your profile right now.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [evmAddress, profileKey])

  useEffect(() => {
    if (!isCreator && activeTab === 'studio') {
      setActiveTab('overview')
    }
  }, [activeTab, isCreator])

  const displayName = useMemo(() => {
    if (creator) return resolveCreatorName(creator, evmAddress)
    return username || usernameOverride || shortAddress(evmAddress)
  }, [creator, evmAddress, username, usernameOverride])

  const displayRole = useMemo(() => {
    if (isCreator && subscriptionItems.length) return 'Creator + collector'
    if (isCreator) return 'Creator'
    if (subscriptionItems.length) return 'Supporter'
    return 'Member'
  }, [isCreator, subscriptionItems.length])

  const avatarGradient = profileForm.avatarGradient || pickGradient(profileKey || evmAddress)
  const activeSubscriptionCount = subscriptionItems.filter((item) => item.isActive).length
  const expiringSoonCount = subscriptionItems.filter(
    (item) => item.isActive && item.expiryMs <= Date.now() + 7 * 24 * 60 * 60 * 1000
  ).length
  const creatorLinkCount = Object.values(
    getSubscriptionConfig(evmAddress)?.links || {}
  ).filter(Boolean).length

  const profileSubtitle = isCreator
    ? capitalize(creator?.category) || 'Digital creator'
    : activeSubscriptionCount
      ? 'Supporting creators on Creato3'
      : 'Community member'

  const summaryStats = isCreator
    ? [
        { label: 'Monthly earnings', value: `${creatorInsights.monthlyRecurringRevenue} INIT` },
        { label: 'Subscribers', value: String(creatorInsights.activeMembers) }
      ]
    : [
        { label: 'Active subscriptions', value: String(activeSubscriptionCount) },
        { label: 'Creators supported', value: String(subscriptionItems.length) }
      ]
  const latestStatement = creatorInsights.transactionStatements[0] || null
  const transactionStatementCount = creatorInsights.transactionStatements.length

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      toast.error('Avatar too large', 'Please choose an image under 1 MB.')
      event.target.value = ''
      return
    }

    try {
      const avatarDataUrl = await readFileAsDataUrl(file)
      setProfileForm((prev) => ({ ...prev, avatarDataUrl, avatarEmoji: '' }))
    } catch {
      toast.error('Avatar failed', 'We could not read that image. Please try another file.')
    } finally {
      event.target.value = ''
    }
  }

  const handleSaveProfile = () => {
    if (!profileKey) {
      toast.error('Connect wallet', 'Connect your wallet before saving profile preferences.')
      return
    }

    saveProfilePreferences(profileKey, profileForm)
    toast.success('Profile updated', 'Your avatar and profile preferences have been saved.')
  }

  const handleCopyHash = async (hash) => {
    if (!hash) return

    try {
      await navigator.clipboard.writeText(hash)
      toast.success('Hash copied', 'Paste it into Initia explorer to verify the transaction.')
    } catch {
      toast.error('Copy failed', 'We could not copy that transaction hash.')
    }
  }

  if (!evmAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <h1 className="mb-4 text-5xl dark:text-white">Profile Hub</h1>
            <p className="mb-8 text-lg text-[#6b7280] dark:text-[#9ca3af]">
              Connect your wallet to manage your avatar, review subscriptions, and unlock creator analytics.
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
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-8 overflow-hidden rounded-[2rem] border border-[rgba(0,0,0,0.08)] bg-white shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
          <div className="bg-gradient-to-br from-[#fdf2f8] via-white to-[#eff6ff] p-8 dark:from-[#202034] dark:via-[#2a2a3e] dark:to-[#16213e] md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div
                  className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient} text-4xl text-[#111827] shadow-lg`}
                >
                  {profileForm.avatarDataUrl ? (
                    <img
                      src={profileForm.avatarDataUrl}
                      alt={displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : profileForm.avatarEmoji ? (
                    <span>{profileForm.avatarEmoji}</span>
                  ) : (
                    <span>{buildInitials(displayName)}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h1 className="truncate text-4xl dark:text-white">{displayName}</h1>
                    <span className="rounded-full bg-white/80 px-4 py-2 text-sm text-[#374151] shadow-sm dark:bg-[#1a1a2e] dark:text-[#cbd5e1]">
                      {displayRole}
                    </span>
                  </div>

                  <p className="mb-4 text-2xl text-[#4b5563] dark:text-[#d1d5db]">
                    {profileSubtitle}
                  </p>

                  <p className="mb-5 max-w-2xl text-lg text-[#6b7280] dark:text-[#9ca3af]">
                    {profileForm.headline ||
                      (isCreator
                        ? creator?.bio || 'Manage your creator identity, members, and recurring revenue.'
                        : 'Track the creators you support and personalize your Creato3 presence.')}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      className="flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-5 py-3 text-[#1f2937] shadow-sm transition-transform hover:scale-105 active:scale-95 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                      onClick={() => openWallet?.()}
                      type="button"
                    >
                      <WalletIcon className="h-4 w-4" />
                      Open wallet
                    </button>
                    {isCreator ? (
                      <Link
                        to={`/creator/${evmAddress}`}
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
                      >
                        View creator page
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        to="/discover"
                        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
                      >
                        Discover creators
                        <ArrowRightIcon className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="w-full max-w-md rounded-[1.75rem] border border-[rgba(0,0,0,0.08)] bg-white/80 p-6 shadow-sm dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]/90">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#9ca3af]">
                      Profile summary
                    </p>
                    <p className="mt-1 dark:text-white">{shortAddress(evmAddress)}</p>
                  </div>
                  {isCreator ? (
                    <span className="rounded-full bg-[#dcfce7] px-4 py-2 text-sm text-[#166534] dark:bg-[#1f3b2b] dark:text-[#86efac]">
                      Creator live
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#eff6ff] px-4 py-2 text-sm text-[#1d4ed8] dark:bg-[#1e293b] dark:text-[#93c5fd]">
                      Member space
                    </span>
                  )}
                </div>

                <div className="space-y-5">
                  {summaryStats.map((item) => (
                    <SummaryStatRow key={item.label} label={item.label} value={item.value} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {PROFILE_TABS.filter((tab) => (tab.id === 'studio' ? isCreator : true)).map((tab) => (
            <button
              key={tab.id}
              className={`rounded-full px-5 py-3 text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] text-[#1f2937] shadow-md'
                  : 'border border-[rgba(0,0,0,0.08)] bg-white text-[#6b7280] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-[#9ca3af]'
              }`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? <div className="mb-6 text-red-500">{error}</div> : null}

        {loading ? (
          <div className="space-y-5">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}

        {!loading && activeTab === 'overview' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={UsersIcon}
                label={isCreator ? 'Audience reach' : 'Supported creators'}
                value={String(isCreator ? creatorInsights.lifetimeMembers : subscriptionItems.length)}
                hint={
                  isCreator
                    ? 'Unique wallets that have subscribed to you'
                    : 'Every creator you have joined with this wallet'
                }
              />
              <MetricCard
                icon={CheckIcon}
                label={isCreator ? 'Active members' : 'Active memberships'}
                value={String(isCreator ? creatorInsights.activeMembers : activeSubscriptionCount)}
                hint={
                  isCreator
                    ? `${creatorInsights.expiringSoon} memberships expiring in 7 days`
                    : 'Subscriptions currently unlocked for premium content'
                }
                tone="blue"
              />
              <MetricCard
                icon={ClockIcon}
                label="Expiring soon"
                value={String(isCreator ? creatorInsights.expiringSoon : expiringSoonCount)}
                hint={
                  isCreator
                    ? 'Members who need a renewal nudge soon'
                    : 'Memberships ending in the next 7 days'
                }
                tone="pink"
              />
              <MetricCard
                icon={isCreator ? DollarSignIcon : SparklesIcon}
                label={isCreator ? 'Monthly revenue' : 'Creator links'}
                value={isCreator ? `${creatorInsights.monthlyRecurringRevenue} INIT` : String(creatorLinkCount)}
                hint={
                  isCreator
                    ? 'Estimated recurring revenue from active tiers'
                    : 'Community channels connected to your creator setup'
                }
                tone="blue"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] p-6 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <div className="mb-4 flex items-center gap-3">
                  <UserCircleIcon className="h-5 w-5 text-[#6ee7b7]" />
                  <h2 className="dark:text-white">Profile Studio</h2>
                </div>

                <div className="mb-5 flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-4 py-2 text-sm text-[#1f2937] shadow-sm dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white">
                    <UploadIcon className="h-4 w-4" />
                    Upload avatar
                    <input
                      className="hidden"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {profileForm.avatarDataUrl ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-[#6b7280] transition-colors hover:border-[#f87171] hover:text-[#dc2626] dark:border-[rgba(255,255,255,0.1)] dark:text-[#9ca3af] dark:hover:text-[#fca5a5]"
                      onClick={() => setProfileForm((prev) => ({ ...prev, avatarDataUrl: '' }))}
                      type="button"
                    >
                      <XIcon className="h-4 w-4" />
                      Remove photo
                    </button>
                  ) : null}
                </div>

                <div className="mb-5">
                  <p className="mb-3 text-sm dark:text-white">Default emoji avatars</p>
                  <div className="flex flex-wrap gap-3">
                    {EMOJI_AVATARS.map((emoji) => {
                      const activeEmoji =
                        profileForm.avatarEmoji === emoji && !profileForm.avatarDataUrl

                      return (
                        <button
                          key={emoji}
                          className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-2xl transition-transform ${
                            activeEmoji
                              ? 'border-[#93c5fd] bg-white ring-2 ring-[#93c5fd] dark:bg-[#2a2a3e]'
                              : 'border-[rgba(0,0,0,0.08)] bg-white hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]'
                          }`}
                          onClick={() =>
                            setProfileForm((prev) => ({
                              ...prev,
                              avatarEmoji: emoji,
                              avatarDataUrl: ''
                            }))
                          }
                          type="button"
                        >
                          {emoji}
                        </button>
                      )
                    })}

                    <button
                      className={`flex h-14 min-w-[5.5rem] items-center justify-center rounded-2xl border px-3 text-sm transition-transform ${
                        !profileForm.avatarEmoji && !profileForm.avatarDataUrl
                          ? 'border-[#93c5fd] bg-white ring-2 ring-[#93c5fd] dark:bg-[#2a2a3e]'
                          : 'border-[rgba(0,0,0,0.08)] bg-white hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white'
                      }`}
                      onClick={() =>
                        setProfileForm((prev) => ({
                          ...prev,
                          avatarEmoji: '',
                          avatarDataUrl: ''
                        }))
                      }
                      type="button"
                    >
                      Use initials
                    </button>
                  </div>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-3">
                  {creatorGradients.slice(0, 6).map((gradient) => {
                    const activeGradient = profileForm.avatarGradient === gradient

                    return (
                      <button
                        key={gradient}
                        aria-label={`Select ${gradient}`}
                        className={`h-14 rounded-2xl bg-gradient-to-br ${gradient} transition-transform ${
                          activeGradient ? 'scale-95 ring-2 ring-[#93c5fd]' : 'hover:scale-105'
                        }`}
                        onClick={() =>
                          setProfileForm((prev) => ({ ...prev, avatarGradient: gradient }))
                        }
                        type="button"
                      />
                    )
                  })}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm dark:text-white">Headline</label>
                    <input
                      type="text"
                      value={profileForm.headline}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, headline: event.target.value }))
                      }
                      placeholder="A short one-line intro for your workspace"
                      className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm dark:text-white">
                      About this workspace
                    </label>
                    <textarea
                      rows={4}
                      value={profileForm.about}
                      onChange={(event) =>
                        setProfileForm((prev) => ({ ...prev, about: event.target.value }))
                      }
                      placeholder="Notes about your creative focus, goals, or membership style"
                      className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-5 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white"
                    />
                  </div>
                </div>

                <button
                  className="mt-5 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-6 py-3 shadow-md transition-transform hover:scale-105 active:scale-95"
                  onClick={handleSaveProfile}
                  type="button"
                >
                  Save profile settings
                </button>

                <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Avatar and workspace notes are saved locally for this app. Your on-chain creator
                  name and bio stay exactly as registered.
                </p>

                {profileForm.about ? (
                  <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#2a2a3e]">
                    <p className="mb-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Workspace note preview
                    </p>
                    <p className="leading-relaxed text-[#374151] dark:text-[#e5e7eb]">
                      {profileForm.about}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="dark:text-white">
                        {isCreator ? 'On-chain creator profile' : 'Account snapshot'}
                      </h2>
                      <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {isCreator
                          ? 'Your registered creator identity that fans see on Creato3.'
                          : 'A quick read on your membership presence and wallet status.'}
                      </p>
                    </div>
                    <Link
                      to={isCreator ? '/launch' : '/discover'}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-[#1f2937] transition-colors hover:border-[#93c5fd] hover:text-[#2563eb] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                    >
                      {isCreator ? 'Manage launch' : 'Browse creators'}
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {isCreator ? 'Display name' : 'Wallet'}
                      </p>
                      <p className="dark:text-white">
                        {isCreator ? creator?.displayName || displayName : shortAddress(evmAddress)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {isCreator ? 'Init username' : 'Role'}
                      </p>
                      <p className="dark:text-white">
                        {isCreator
                          ? creator?.initUsername || usernameOverride || 'Not set'
                          : displayRole}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {isCreator ? 'Category' : 'Active access'}
                      </p>
                      <p className="dark:text-white">
                        {isCreator
                          ? capitalize(creator?.category) || 'Creator'
                          : `${activeSubscriptionCount} memberships`}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {isCreator ? 'Publishing status' : 'Creator status'}
                      </p>
                      <p className="dark:text-white">
                        {isCreator ? `${creatorInsights.contentCount} premium items live` : 'Viewer only'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                    {isCreator
                      ? creator?.bio ||
                        profileForm.about ||
                        'Add a bio to your creator profile to tell members what they get when they subscribe.'
                      : profileForm.about ||
                        'Use your profile studio to set a headline, choose an avatar, and keep track of the creators you support.'}
                  </p>
                </div>

                {isCreator ? (
                  <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                    <div className="mb-4">
                      <h2 className="dark:text-white">Treasury statement</h2>
                      <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        Subscription payments in this build are recorded on-chain through creator
                        treasury events. Use the tx hash to verify them on Initia.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                        <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          Total earned
                        </p>
                        <p className="text-2xl dark:text-white">
                          {creatorInsights.totalEarned} INIT
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                        <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          Verified transactions
                        </p>
                        <p className="text-2xl dark:text-white">{transactionStatementCount}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                        <p className="mb-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          Latest tx hash
                        </p>
                        {latestStatement ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <code className="rounded-full bg-white px-3 py-2 text-sm text-[#1f2937] dark:bg-[#141425] dark:text-[#dbeafe]">
                              {shortHash(latestStatement.transactionHash)}
                            </code>
                            <button
                              className="rounded-full border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm text-[#374151] transition-colors hover:border-[#93c5fd] hover:text-[#2563eb] dark:border-[rgba(255,255,255,0.1)] dark:text-[#d1d5db]"
                              onClick={() => handleCopyHash(latestStatement.transactionHash)}
                              type="button"
                            >
                              Copy hash
                            </button>
                          </div>
                        ) : (
                          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                            Your first verified payment or withdrawal will appear here.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                    <h2 className="mb-4 dark:text-white">Membership pulse</h2>
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                        <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          Expiring soon
                        </p>
                        <p className="text-2xl dark:text-white">{expiringSoonCount}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                        <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                          Connected creator links
                        </p>
                        <p className="text-2xl dark:text-white">{creatorLinkCount}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === 'subscriptions' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MetricCard
                icon={UsersIcon}
                label="Creators supported"
                value={String(subscriptionItems.length)}
                hint="All creators attached to this wallet"
              />
              <MetricCard
                icon={RepeatIcon}
                label="Active access"
                value={String(activeSubscriptionCount)}
                hint="Subscriptions currently unlocked"
                tone="blue"
              />
              <MetricCard
                icon={ClockIcon}
                label="Expiring soon"
                value={String(expiringSoonCount)}
                hint="Plan renewals before access lapses"
                tone="pink"
              />
            </div>

            {subscriptionItems.length ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {subscriptionItems.map((item) => (
                  <div
                    key={item.address}
                    className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]"
                  >
                    <div className="mb-5 flex items-start gap-4">
                      <div
                        className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${item.gradient} text-2xl`}
                      >
                        {resolveCreatorName(item.creator, item.address).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="truncate dark:text-white">
                            {resolveCreatorName(item.creator, item.address)}
                          </h3>
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
                          {capitalize(item.creator?.category) || 'Creator'} ·{' '}
                          {shortAddress(item.address)}
                        </p>
                      </div>
                    </div>

                    <div className="mb-5 space-y-3 rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                      <div className="flex items-center justify-between text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-2">
                          <DollarSignIcon className="h-4 w-4" />
                          Membership
                        </span>
                        <span className="dark:text-white">
                          {item.tier?.price !== undefined
                            ? `${formatInit(item.tier.price)} INIT`
                            : 'Tier available'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        <span className="flex items-center gap-2">
                          <ClockIcon className="h-4 w-4" />
                          Access until
                        </span>
                        <span className="dark:text-white">
                          {item.expiryMs ? monthFormatter.format(item.expiryMs) : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={`/creator/${item.address}`}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
                    >
                      {item.isActive ? 'View creator content' : 'Open creator page'}
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-10 text-center shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <h2 className="mb-3 dark:text-white">No subscriptions yet</h2>
                <p className="mb-6 text-[#6b7280] dark:text-[#9ca3af]">
                  Start supporting creators and your membership history will appear here.
                </p>
                <Link
                  to="/discover"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-6 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
                >
                  Explore creators
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
            )}

            <div className="flex justify-end">
              <Link
                to="/subscriptions"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] px-5 py-3 text-[#1f2937] transition-colors hover:border-[#93c5fd] hover:text-[#2563eb] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
              >
                Open full subscriptions page
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : null}

        {!loading && activeTab === 'studio' && isCreator ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={UsersIcon}
                label="Lifetime members"
                value={String(creatorInsights.lifetimeMembers)}
                hint="Unique wallets that subscribed to you"
              />
              <MetricCard
                icon={CheckIcon}
                label="Active members"
                value={String(creatorInsights.activeMembers)}
                hint={`${creatorInsights.expiringSoon} memberships expiring in 7 days`}
                tone="blue"
              />
              <MetricCard
                icon={DollarSignIcon}
                label="MRR"
                value={`${creatorInsights.monthlyRecurringRevenue} INIT`}
                hint="Estimated current recurring revenue"
                tone="pink"
              />
              <MetricCard
                icon={TrendingUpIcon}
                label="Renewal rate"
                value={`${creatorInsights.renewalRate}%`}
                hint={`${creatorInsights.renewals} renewals recorded on-chain`}
                tone="blue"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <div className="mb-4">
                  <h2 className="dark:text-white">Membership growth</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Join and renewal momentum across the last 6 months.
                  </p>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={creatorInsights.activityData}>
                      <defs>
                        <linearGradient id="joinFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="renewFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.18)"
                      />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="joins"
                        stroke="#34d399"
                        fill="url(#joinFill)"
                      />
                      <Area
                        type="monotone"
                        dataKey="renewals"
                        stroke="#60a5fa"
                        fill="url(#renewFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <div className="mb-4">
                  <h2 className="dark:text-white">Revenue and verification</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Track treasury totals and the payment records you can verify on Initia.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                    <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Total earned
                    </p>
                    <p className="text-2xl dark:text-white">
                      {creatorInsights.totalEarned} INIT
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                    <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Verified statements
                    </p>
                    <p className="text-2xl dark:text-white">{transactionStatementCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]">
                    <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Premium library
                    </p>
                    <p className="text-2xl dark:text-white">{creatorInsights.contentCount} items</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Copy any tx hash below and paste it into Initia tools or your preferred explorer
                  to verify the exact treasury movement.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <div className="mb-4">
                  <h2 className="dark:text-white">Content mix</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Your premium catalog across posts, media, and resources.
                  </p>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={creatorInsights.contentMix}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(148,163,184,0.18)"
                      />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#93c5fd" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {!creatorInsights.contentMix.length ? (
                  <p className="mt-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Publish content through Launch and Creator tools to start seeing category
                    analytics here.
                  </p>
                ) : null}
              </div>

              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <div className="mb-4 flex items-center gap-3">
                  <SparklesIcon className="h-5 w-5 text-[#6ee7b7]" />
                  <div>
                    <h2 className="dark:text-white">Recent transaction statements</h2>
                    <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                      Recent treasury receipts and creator withdrawals with copyable hashes.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {creatorInsights.transactionStatements.length ? (
                    creatorInsights.transactionStatements.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#2a2a3e]"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <p className="dark:text-white">{item.type}</p>
                              <span
                                className={`rounded-full px-3 py-1 text-xs ${
                                  item.tone === 'blue'
                                    ? 'bg-[#dbeafe] text-[#1d4ed8] dark:bg-[#1e3a8a]/40 dark:text-[#93c5fd]'
                                    : 'bg-[#dcfce7] text-[#166534] dark:bg-[#1f3b2b] dark:text-[#86efac]'
                                }`}
                              >
                                {item.amount}
                              </span>
                            </div>
                            <p className="mb-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                              {item.timestampMs ? monthFormatter.format(item.timestampMs) : 'Pending'}
                            </p>
                            <code className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-white px-3 py-2 text-sm text-[#1f2937] dark:bg-[#141425] dark:text-[#dbeafe]">
                              {item.transactionHash}
                            </code>
                          </div>
                          <button
                            className="self-start rounded-full border border-[rgba(0,0,0,0.08)] px-3 py-2 text-sm text-[#374151] transition-colors hover:border-[#93c5fd] hover:text-[#2563eb] dark:border-[rgba(255,255,255,0.1)] dark:text-[#d1d5db]"
                            onClick={() => handleCopyHash(item.transactionHash)}
                            type="button"
                          >
                            Copy hash
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[#f9fafb] p-4 text-sm text-[#6b7280] dark:bg-[#2a2a3e] dark:text-[#9ca3af]">
                      No treasury statements yet. Once subscription payments start landing or you
                      make a withdrawal, the hashes will show up here.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    to="/launch"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95"
                  >
                    Update creator offer
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    to={`/creator/${evmAddress}`}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] px-5 py-3 text-[#1f2937] transition-colors hover:border-[#93c5fd] hover:text-[#2563eb] dark:border-[rgba(255,255,255,0.1)] dark:text-white"
                  >
                    Open public page
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
