import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AnimatedBlobs } from './AnimatedBlobs'

const featureCards = [
  {
    icon: '🔐',
    title: 'Auto-Signing',
    body:
      'Subscribe once, never see a wallet popup again. Ghost wallets make recurring payments feel like Web2.'
  },
  {
    icon: '🌉',
    title: 'Interwoven Bridge',
    body:
      'Bridge INIT from L1 in seconds. One click gets new fans funded and ready to subscribe on your appchain.'
  },
  {
    icon: '👤',
    title: '.init Usernames',
    body:
      'Human-readable identities everywhere. Show priya.init instead of a long wallet address.'
  }
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="relative overflow-hidden">
        <AnimatedBlobs />

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="space-y-8"
            >
              <div className="inline-block rounded-full border border-black/10 bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20 px-4 py-2 dark:border-white/10">
                <span className="text-sm text-slate-700 dark:text-white">Powered by Initia Blockchain</span>
              </div>

              <h1 className="text-5xl leading-tight text-balance dark:text-white lg:text-6xl">
                Monetize your content{' '}
                <span className="bg-gradient-to-r from-[#6ee7b7] to-[#93c5fd] bg-clip-text text-transparent">
                  without platform cuts
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-slate-500 dark:text-slate-400">
                Launch your subscription service on Web3. Connect directly with your audience,
                keep 100% of your earnings with zero middlemen. Built on Initia's appchain infrastructure.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/create-profile">
                  <button className="glow-btn gap-2 px-8 py-4">
                    Start Creating
                    <span aria-hidden="true">→</span>
                  </button>
                </Link>
                <Link to="/discover">
                  <button className="btn-secondary px-8 py-4">Explore Creators</button>
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-8 pt-4">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="text-2xl text-slate-900 dark:text-white">0%</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Platform Fees</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span className="text-2xl text-slate-900 dark:text-white">10k+</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Creators</p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-lg">💸</span>
                    <span className="text-2xl text-slate-900 dark:text-white">$2M+</span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Earned</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.12 }}
              className="relative"
            >
              <div className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-2xl dark:border-white/10 dark:bg-[#2a2a3e]">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#a7f3d0] to-[#93c5fd] text-3xl">
                    👩‍🎨
                  </div>
                  <div>
                    <h3 className="dark:text-white">sarah.init</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Digital Artist</p>
                  </div>
                </div>

                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Monthly Earnings</span>
                    <span className="text-2xl text-slate-900 dark:text-white">$12,705</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Subscribers</span>
                    <span className="text-xl text-slate-900 dark:text-white">847</span>
                  </div>
                </div>

                <div className="border-t border-black/10 pt-4 dark:border-white/10">
                  <div className="mb-2 text-sm text-slate-500 dark:text-slate-400">vs Patreon (10% fee)</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-400 line-through">$11,434</span>
                    <span className="text-sm text-emerald-400">+$1,271 saved</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl dark:text-white">Powered by Initia Features</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400">
            Advanced blockchain technology that feels like Web2
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className="rounded-[2rem] border border-black/10 bg-white p-8 shadow-lg transition-transform hover:scale-[1.03] dark:border-white/10 dark:bg-[#2a2a3e]"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a7f3d0]/30 to-[#93c5fd]/25 text-2xl">
                {card.icon}
              </div>
              <h3 className="mb-3 dark:text-white">{card.title}</h3>
              <p className="leading-relaxed text-slate-500 dark:text-slate-400">{card.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="mb-6 text-4xl dark:text-white">Why Choose Creato3?</h2>
        <div className="rounded-[2rem] border border-black/10 bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-12 dark:border-white/10">
          <p className="mb-8 text-2xl text-slate-900 dark:text-white">
            Patreon takes <span className="text-red-400">10%</span>. Substack takes{' '}
            <span className="text-red-400">10%</span>. Creato3 takes{' '}
            <span className="font-bold text-emerald-400">zero</span>.
          </p>
          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div>
              <div className="mb-2 text-3xl text-slate-900 dark:text-white">100%</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Revenue to creators</p>
            </div>
            <div>
              <div className="mb-2 text-3xl text-slate-900 dark:text-white">Instant</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Withdrawals anytime</p>
            </div>
            <div>
              <div className="mb-2 text-3xl text-slate-900 dark:text-white">Global</div>
              <p className="text-sm text-slate-500 dark:text-slate-400">No payment processor needed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
