import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { useTheme } from './ThemeProvider'
import { getUsernameOverride } from '../utils/usernameStore'

const truncate = (value) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''

export function Header() {
  const { address, hexAddress, initiaAddress, username, openConnect, openWallet } = useInterwovenKit()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const resolvedUsername = username || getUsernameOverride(initiaAddress || address)
  const addressLabel = hexAddress || address
  const nav = [
    { label: 'Discover', href: '/discover' },
    { label: 'Create', href: '/create-profile' },
    { label: 'Launch', href: '/launch' }
  ]

  return (
    <div className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur-lg dark:border-white/10 dark:bg-[#1a1a2e]/80">
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6"
      >
        <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#a7f3d0] to-[#93c5fd] text-lg font-bold text-slate-800">
            C3
          </span>
          <span className="font-body text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Creato3
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.href)
            return (
              <Link
                key={item.label}
                to={item.href}
                className={`relative text-sm transition-colors ${
                  active
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <span className="relative z-10">{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
            onClick={toggleTheme}
            type="button"
            aria-label="Toggle theme"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
              {theme === 'dark' ? 'Light' : 'Dark'}
            </span>
          </button>

          {!address ? (
            <button className="glow-btn px-5 py-2.5" onClick={openConnect} type="button">
              Connect Wallet
            </button>
          ) : (
            <button className="btn-secondary px-5 py-2.5" onClick={openWallet} type="button">
              {resolvedUsername || truncate(addressLabel)}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
