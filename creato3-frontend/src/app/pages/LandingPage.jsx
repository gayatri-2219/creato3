import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import { CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { AnimatedBlobs } from '../components/AnimatedBlobs'
import {
  ArrowRightIcon,
  DollarSignIcon,
  RepeatIcon,
  ShieldIcon,
  UserCircleIcon,
  UsersIcon,
  ZapIcon
} from '../components/icons'

export function LandingPage() {
  const [creatorCount, setCreatorCount] = useState('10k+')

  useEffect(() => {
    if (!CONTRACTS.profile) return
    let active = true

    const loadCreatorCount = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACTS.profile,
          event: CREATOR_PROFILE_ABI.find((entry) => entry.name === 'CreatorRegistered'),
          fromBlock: 0n,
          toBlock: 'latest'
        })

        const count = [...new Set(logs.map((log) => log.args?.wallet))].filter(Boolean).length

        if (active && count > 0) {
          setCreatorCount(count.toLocaleString())
        }
      } catch {
        if (active) {
          setCreatorCount('10k+')
        }
      }
    }

    loadCreatorCount()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="relative overflow-hidden">
        <AnimatedBlobs />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-32">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-8">
              <div className="inline-block">
                <div className="rounded-full border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20 px-4 py-2 dark:border-[rgba(255,255,255,0.1)]">
                  <span className="text-sm dark:text-white">Powered by Initia Blockchain</span>
                </div>
              </div>

              <h1 className="text-5xl leading-tight dark:text-white lg:text-6xl">
                Monetize your content{' '}
                <span className="bg-gradient-to-r from-[#6ee7b7] to-[#93c5fd] bg-clip-text text-transparent">
                  without platform cuts
                </span>
              </h1>

              <p className="text-lg leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                Launch your subscription service on Web3. Connect directly with your audience,
                keep 100% of your earnings with zero middlemen. Built on Initia&apos;s appchain
                infrastructure.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/create-profile">
                  <button className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95">
                    Start Creating
                    <ArrowRightIcon className="h-5 w-5" />
                  </button>
                </Link>
                <Link to="/discover">
                  <button className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white">
                    Explore Creators
                  </button>
                </Link>
                <Link to="/architecture">
                  <button className="rounded-full border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.72)] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]/70 dark:text-white">
                    See Architecture Story
                  </button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-8">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <ZapIcon className="h-5 w-5 text-[#6ee7b7]" />
                    <span className="text-2xl dark:text-white">0%</span>
                  </div>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Platform Fees</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <UsersIcon className="h-5 w-5 text-[#93c5fd]" />
                    <span className="text-2xl dark:text-white">{creatorCount}</span>
                  </div>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Creators</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <DollarSignIcon className="h-5 w-5 text-[#ddd6fe]" />
                    <span className="text-2xl dark:text-white">$2M+</span>
                  </div>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Earned</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#a7f3d0] to-[#93c5fd] text-3xl">
                    👩‍🎨
                  </div>
                  <div>
                    <h3 className="dark:text-white">sarah.init</h3>
                    <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Digital Artist</p>
                  </div>
                </div>

                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Monthly Earnings</span>
                    <span className="text-2xl dark:text-white">$12,705</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6b7280] dark:text-[#9ca3af]">Subscribers</span>
                    <span className="text-xl dark:text-white">847</span>
                  </div>
                </div>

                <div className="border-t border-[rgba(0,0,0,0.08)] pt-4 dark:border-[rgba(255,255,255,0.1)]">
                  <div className="mb-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    vs Patreon (10% fee)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#ef4444] line-through">$11,434</span>
                    <span className="text-sm text-[#6ee7b7]">+$1,271 saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl dark:text-white">Powered by Initia Features</h2>
          <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
            Advanced blockchain technology that feels like Web2
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg transition-transform hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a7f3d0]/20 to-[#6ee7b7]/20">
              <ShieldIcon className="h-7 w-7 text-[#6ee7b7]" />
            </div>
            <h3 className="mb-3 dark:text-white">Auto-Signing</h3>
            <p className="leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
              Subscribe once, never see a wallet popup again. Ghost wallets enable seamless
              recurring payments without constant confirmation.
            </p>
          </div>

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg transition-transform hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#93c5fd]/20 to-[#bfdbfe]/20">
              <RepeatIcon className="h-7 w-7 text-[#93c5fd]" />
            </div>
            <h3 className="mb-3 dark:text-white">Interwoven Bridge</h3>
            <p className="leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
              Bridge INIT tokens from L1 in seconds. One-click IBC transfers make funding your
              account effortless.
            </p>
          </div>

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg transition-transform hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ddd6fe]/20 to-[#fbcfe8]/20">
              <UserCircleIcon className="h-7 w-7 text-[#ddd6fe]" />
            </div>
            <h3 className="mb-3 dark:text-white">.init Usernames</h3>
            <p className="leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
              Human-readable identities replace crypto addresses. Your creator profile shows
              alice.init, not 0x3f8a2b...
            </p>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 text-[#111827] shadow-lg transition-transform hover:scale-105 active:scale-95"
            to="/architecture"
          >
            Take the guided architecture tour
            <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="mb-6 text-4xl dark:text-white">Why Choose Creato3?</h2>
        <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-12 dark:border-[rgba(255,255,255,0.1)]">
          <p className="mb-8 text-2xl dark:text-white">
            &quot;Patreon takes <span className="text-[#ef4444]">10%</span>. Substack takes{' '}
            <span className="text-[#ef4444]">10%</span>. Creato3 takes{' '}
            <span className="font-bold text-[#6ee7b7]">zero</span>.&quot;
          </p>
          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div>
              <div className="mb-2 text-3xl dark:text-white">100%</div>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Revenue to creators</p>
            </div>
            <div>
              <div className="mb-2 text-3xl dark:text-white">Instant</div>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">Withdrawals anytime</p>
            </div>
            <div>
              <div className="mb-2 text-3xl dark:text-white">Global</div>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                No payment processor needed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
