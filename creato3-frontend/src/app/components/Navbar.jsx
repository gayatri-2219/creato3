import { Link, useLocation } from 'react-router-dom'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import { getUsernameOverride } from '../../utils/usernameStore'
import { useTheme } from '../../components/ThemeProvider'
import { Logo } from './Logo'
import { MoonIcon, SunIcon, WalletIcon } from './icons'

const navLinks = [
  { label: 'Discover', to: '/discover' },
  { label: 'Create', to: '/create-profile' },
  { label: 'Launch', to: '/launch' }
]

const truncate = (value) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '')

export function Navbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { address, hexAddress, initiaAddress, username, openConnect, openWallet } = useInterwovenKit()

  const resolvedUsername = username || getUsernameOverride(initiaAddress || address)
  const walletLabel = resolvedUsername || truncate(hexAddress || address)

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-[rgba(0,0,0,0.08)] bg-white/80 backdrop-blur-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link className="transition-opacity hover:opacity-80" to="/">
          <Logo />
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => {
            const active =
              item.to === '/'
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to)

            return (
              <Link
                key={item.to}
                className={`transition-colors ${
                  active
                    ? 'text-[#1f2937] dark:text-white'
                    : 'text-[#1f2937] hover:text-[#6b7280] dark:text-white dark:hover:text-[#9ca3af]'
                }`}
                to={item.to}
              >
                {item.label}
              </Link>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Toggle dark mode"
            className="rounded-full p-2 transition-colors hover:bg-[#f3f4f6] dark:hover:bg-[#2a2a3e]"
            onClick={toggleTheme}
            type="button"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-5 w-5 text-yellow-500" />
            ) : (
              <MoonIcon className="h-5 w-5 text-[#6b7280]" />
            )}
          </button>

          {!address ? (
            <button
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-5 py-2.5 shadow-sm transition-transform hover:scale-105 active:scale-95"
              onClick={openConnect}
              type="button"
            >
              <WalletIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Wallet</span>
            </button>
          ) : (
            <button
              className="flex items-center gap-2 rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-5 py-2.5 text-[#1f2937] shadow-sm transition-transform hover:scale-105 active:scale-95 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white"
              onClick={openWallet}
              type="button"
            >
              <WalletIcon className="h-4 w-4" />
              <span className="max-w-[10rem] truncate">{walletLabel}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
