import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import SUBSCRIPTION_ABI from '../../abis/SubscriptionManager.json'
import { Skeleton } from '../../components/Skeleton'
import { CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { capitalize, pickGradient, resolveCreatorName, shortAddress } from '../lib/formatters'
import { ClockIcon, SearchIcon, TrendingUpIcon, UsersIcon } from '../components/icons'

export function DiscoverPage() {
  const [activeTab, setActiveTab] = useState('popular')
  const [searchQuery, setSearchQuery] = useState('')
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadCreators = async () => {
      if (!CONTRACTS.profile || !CONTRACTS.subscription) {
        if (active) {
          setCreators([])
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)

        const creatorLogs = await publicClient.getLogs({
          address: CONTRACTS.profile,
          event: CREATOR_PROFILE_ABI.find((entry) => entry.name === 'CreatorRegistered'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const subscriptionLogs = await publicClient.getLogs({
          address: CONTRACTS.subscription,
          event: SUBSCRIPTION_ABI.find((entry) => entry.name === 'Subscribed'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const uniqueAddresses = [...new Set(creatorLogs.map((log) => log.args?.wallet))]
          .filter(Boolean)

        const liveCreators = await Promise.all(
          uniqueAddresses.map(async (address) => {
            const data = await publicClient.readContract({
              address: CONTRACTS.profile,
              abi: CREATOR_PROFILE_ABI,
              functionName: 'getCreator',
              args: [address]
            })

            return {
              address,
              username: data?.initUsername || data?.displayName || shortAddress(address),
              bio: data?.bio || 'Premium creator content available on Creato3.',
              category: capitalize(data?.category) || 'Creator',
              subscribers: subscriptionLogs.filter(
                (log) => log.args?.creator?.toLowerCase() === address.toLowerCase()
              ).length,
              createdAt: Number(data?.createdAt || 0),
              gradient: pickGradient(address)
            }
          })
        )

        if (active) {
          setCreators(liveCreators)
        }
      } catch {
        if (active) {
          setCreators([])
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadCreators()

    return () => {
      active = false
    }
  }, [])

  const filteredCreators = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const matched = creators.filter((creator) => {
      if (!normalizedQuery) return true

      return (
        creator.username.toLowerCase().includes(normalizedQuery) ||
        creator.bio.toLowerCase().includes(normalizedQuery) ||
        creator.category.toLowerCase().includes(normalizedQuery)
      )
    })

    if (activeTab === 'new') {
      return [...matched].sort((left, right) => right.createdAt - left.createdAt)
    }

    return [...matched].sort((left, right) => right.subscribers - left.subscribers)
  }, [activeTab, creators, searchQuery])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl dark:text-white">Discover Creators</h1>
          <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
            Support talented creators building on Web3
          </p>
        </div>

        <div className="mb-8 space-y-6">
          <div className="relative mx-auto max-w-2xl">
            <SearchIcon className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280] dark:text-[#9ca3af]" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-full border border-[rgba(0,0,0,0.08)] bg-white py-4 pl-14 pr-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white"
            />
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex items-center gap-2 rounded-full px-6 py-3 transition-all ${
                activeTab === 'popular'
                  ? 'scale-105 bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] shadow-lg'
                  : 'border border-[rgba(0,0,0,0.08)] bg-white hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white'
              }`}
              type="button"
            >
              <TrendingUpIcon className="h-4 w-4" />
              Popular
            </button>
            <button
              onClick={() => setActiveTab('new')}
              className={`flex items-center gap-2 rounded-full px-6 py-3 transition-all ${
                activeTab === 'new'
                  ? 'scale-105 bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] shadow-lg'
                  : 'border border-[rgba(0,0,0,0.08)] bg-white hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white'
              }`}
              type="button"
            >
              <ClockIcon className="h-4 w-4" />
              New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
                >
                  <div className="mb-4 flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="mb-4 h-4 w-full" />
                  <Skeleton className="mb-4 h-4 w-5/6" />
                  <div className="border-t border-[rgba(0,0,0,0.08)] pt-4 dark:border-[rgba(255,255,255,0.1)]">
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))
            : filteredCreators.map((creator) => (
                <Link key={creator.address} to={`/creator/${creator.address}`}>
                  <div className="group rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
                    <div className="mb-4 flex items-start gap-4">
                      <div
                        className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${creator.gradient} text-3xl`}
                      >
                        {resolveCreatorName({ initUsername: creator.username }).slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate dark:text-white">{creator.username}</h3>
                        <span className="inline-block rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-[#6b7280] dark:bg-[#1a1a2e] dark:text-[#9ca3af]">
                          {creator.category}
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 line-clamp-2 leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                      {creator.bio}
                    </p>

                    <div className="flex items-center justify-between border-t border-[rgba(0,0,0,0.08)] pt-4 dark:border-[rgba(255,255,255,0.1)]">
                      <div className="flex items-center gap-2 text-[#6b7280] dark:text-[#9ca3af]">
                        <UsersIcon className="h-4 w-4" />
                        <span className="text-sm">{creator.subscribers.toLocaleString()}</span>
                      </div>
                      <span className="text-sm text-[#6ee7b7]">View Profile →</span>
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {!loading && filteredCreators.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
              No creators found matching your search.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
