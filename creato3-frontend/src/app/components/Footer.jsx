import { Link } from 'react-router-dom'
import {
  GithubIcon,
  HeartIcon,
  MessageCircleIcon,
  TwitterIcon
} from './icons'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[rgba(0,0,0,0.08)] bg-white dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <h4 className="mb-4 font-sans dark:text-white">Product</h4>
            <ul className="space-y-2 text-[#6b7280] dark:text-[#9ca3af]">
              <li>
                <Link className="transition-colors hover:text-[#1f2937] dark:hover:text-white" to="/discover">
                  Discover
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#1f2937] dark:hover:text-white" to="/create-profile">
                  Create Profile
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-[#1f2937] dark:hover:text-white" to="/launch">
                  Launch Subscription
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sans dark:text-white">Initia Features</h4>
            <ul className="space-y-2 text-[#6b7280] dark:text-[#9ca3af]">
              <li>Auto-Signing</li>
              <li>Interwoven Bridge</li>
              <li>.init Usernames</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sans dark:text-white">Learn More</h4>
            <ul className="space-y-2 text-[#6b7280] dark:text-[#9ca3af]">
              <li>
                <Link
                  className="transition-colors hover:text-[#1f2937] dark:hover:text-white"
                  to="/architecture"
                >
                  Architecture Story
                </Link>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-[#1f2937] dark:hover:text-white"
                  href="https://initia.xyz"
                  target="_blank"
                  rel="noreferrer"
                >
                  About Initia
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-[#1f2937] dark:hover:text-white"
                  href="https://docs.initia.xyz"
                  target="_blank"
                  rel="noreferrer"
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  className="transition-colors hover:text-[#1f2937] dark:hover:text-white"
                  href="https://app.testnet.initia.xyz/usernames"
                  target="_blank"
                  rel="noreferrer"
                >
                  Register .init Name
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-sans dark:text-white">Connect</h4>
            <div className="flex gap-4">
              <a
                className="text-[#6b7280] transition-colors hover:text-[#1f2937] dark:text-[#9ca3af] dark:hover:text-white"
                href="#"
                aria-label="X"
              >
                <TwitterIcon className="h-5 w-5" />
              </a>
              <a
                className="text-[#6b7280] transition-colors hover:text-[#1f2937] dark:text-[#9ca3af] dark:hover:text-white"
                href="#"
                aria-label="GitHub"
              >
                <GithubIcon className="h-5 w-5" />
              </a>
              <a
                className="text-[#6b7280] transition-colors hover:text-[#1f2937] dark:text-[#9ca3af] dark:hover:text-white"
                href="#"
                aria-label="Community"
              >
                <MessageCircleIcon className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-[rgba(0,0,0,0.08)] pt-8 text-center dark:border-[rgba(255,255,255,0.1)]">
          <p className="flex flex-wrap items-center justify-center gap-2 text-[#6b7280] dark:text-[#9ca3af]">
            <span>© 2026 Creato3. Zero platform fees, powered by blockchain.</span>
          </p>
          <p className="mt-2 flex items-center justify-center gap-2 text-[#6b7280] dark:text-[#9ca3af]">
            Built with <HeartIcon className="h-4 w-4 fill-red-500 text-red-500" /> on
            <a
              className="font-medium text-[#6ee7b7] transition-colors hover:text-[#a7f3d0]"
              href="https://initia.xyz"
              target="_blank"
              rel="noreferrer"
            >
              Initia
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
