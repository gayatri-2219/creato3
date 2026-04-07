import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ethers } from 'ethers'
import CREATOR_PROFILE_ABI from '../abis/CreatorProfile.json'
import SUBSCRIPTION_ABI from '../abis/SubscriptionManager.json'
import { CONTRACTS } from '../config/contracts'
import { publicClient } from '../config/evmClient'
import { Skeleton } from './Skeleton'
import { getSubscriptionConfig } from '../utils/subscriptionStore'

const gradients = [
  'from-[#fbcfe8] to-[#ddd6fe]',
  'from-[#a7f3d0] to-[#6ee7b7]',
  'from-[#93c5fd] to-[#bfdbfe]',
  'from-[#ddd6fe] to-[#c4b5fd]',
  'from-[#fecaca] to-[#fbcfe8]',
  'from-[#bfdbfe] to-[#93c5fd]'
]

const short = (value) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''

const formatInit = (value) => {
  try {
    return ethers.formatEther(value)
  } catch {
    return '0'
  }
}

export function DiscoverPage() {
  const [creators, setCreators] = useState([])
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('popular')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const logs = await publicClient.getLogs({
          address: CONTRACTS.profile,
          event: CREATOR_PROFILE_ABI.find((entry) => entry.name === 'CreatorRegistered'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const unique = [...new Set(logs.map((log) => log.args?.wallet))].filter(Boolean)

        const subLogs = await publicClient.getLogs({
          address: CONTRACTS.subscription,
          event: SUBSCRIPTION_ABI.find((entry) => entry.name === 'Subscribed'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const creatorsData = await Promise.all(
          unique.map(async (addr, index) => {
            const data = await publicClient.readContract({
              address: CONTRACTS.profile,
              abi: CREATOR_PROFILE_ABI,
              functionName: 'getCreator',
              args: [addr]
            })

            const [tierList] = await publicClient.readContract({
              address: CONTRACTS.profile,
              abi: CREATOR_PROFILE_ABI,
              functionName: 'getActiveTiers',
              args: [addr]
            })

            let lowest = tierList?.length
              ? tierList.reduce((min, tier) => (tier.price < min ? tier.price : min), tierList[0].price)
              : 0n

            if (!tierList?.length) {
              const config = getSubscriptionConfig(addr)
              if (config?.price) {
                try {
                  lowest = ethers.parseEther(String(config.price))
                } catch {
                  lowest = 0n
                }
              }
            }

            const count = subLogs.filter(
              (log) => log.args?.creator?.toLowerCase() === addr.toLowerCase()
            ).length

            return {
              address: addr,
              displayName: data.displayName,
              initUsername: data.initUsername,
              category: data.category,
              subscriberCount: count,
              lowestPrice: lowest,
              gradient: gradients[index % gradients.length]
            }
          })
        )

        setCreators(creatorsData)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase()
    const base = creators
      .filter((creator) => {
        return (
          creator.displayName?.toLowerCase().includes(normalized) ||
          creator.initUsername?.toLowerCase().includes(normalized) ||
          creator.category?.toLowerCase().includes(normalized)
        )
      })

    if (tab === 'new') {
      return [...base].reverse()
    }

    return [...base].sort((a, b) => b.subscriberCount - a.subscriberCount)
  }, [creators, query, tab])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl dark:text-white">Discover Creators</h1>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Support talented creators building premium communities on Initia
          </p>
        </div>

        <div className="mb-8 space-y-6">
          <div className="relative mx-auto max-w-2xl">
            <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            <input
              type="text"
              placeholder="Search creators..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-black/10 bg-white py-4 pl-14 pr-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-white/10 dark:bg-[#2a2a3e] dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setTab('popular')}
              className={`rounded-full px-6 py-3 transition-all ${
                tab === 'popular'
                  ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] shadow-lg'
                  : 'border border-black/10 bg-white dark:border-white/10 dark:bg-[#2a2a3e] dark:text-white'
              }`}
            >
              ↗ Popular
            </button>
            <button
              onClick={() => setTab('new')}
              className={`rounded-full px-6 py-3 transition-all ${
                tab === 'new'
                  ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] shadow-lg'
                  : 'border border-black/10 bg-white dark:border-white/10 dark:bg-[#2a2a3e] dark:text-white'
              }`}
            >
              ◷ New
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-[#2a2a3e]"
                >
                  <Skeleton className="mb-4 h-16 w-16 rounded-full" />
                  <Skeleton className="mb-3 h-6 w-32" />
                  <Skeleton className="mb-2 h-4 w-24 rounded-full" />
                  <Skeleton className="mb-6 h-4 w-full" />
                  <Skeleton className="h-10 w-full rounded-full" />
                </div>
              ))
            : filtered.map((creator) => (
                <Link key={creator.address} to={`/creator/${creator.address}`}>
                  <div className="group rounded-[2rem] border border-black/10 bg-white p-6 shadow-lg transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl dark:border-white/10 dark:bg-[#2a2a3e]">
                    <div className="mb-4 flex items-start gap-4">
                      <div
                        className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${creator.gradient} text-2xl font-semibold text-slate-800`}
                      >
                        {(creator.displayName || 'C').slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 truncate dark:text-white">
                          {creator.displayName || short(creator.address)}
                        </h3>
                        <span className="inline-block rounded-full bg-[#f3f4f6] px-3 py-1 text-xs text-slate-500 dark:bg-[#1a1a2e] dark:text-slate-400">
                          {creator.category || 'creator'}
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 line-clamp-2 text-slate-500 dark:text-slate-400">
                      {creator.initUsername || short(creator.address)} is building a premium creator community on Creato3.
                    </p>

                    <div className="border-t border-black/10 pt-4 dark:border-white/10">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <span>👥 {creator.subscriberCount.toLocaleString()} subscribers</span>
                        <span>From {formatInit(creator.lowestPrice)} INIT</span>
                      </div>
                      <span className="text-sm text-emerald-500">View Profile →</span>
                    </div>
                  </div>
                </Link>
              ))}
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-lg text-slate-500 dark:text-slate-400">
              No creators found matching your filters.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
