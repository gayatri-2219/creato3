import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-20 border-t border-black/10 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-[#1a1a2e]/85">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <h4 className="font-body text-base font-semibold text-slate-900 dark:text-white">Product</h4>
          <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <Link className="block transition-colors hover:text-slate-900 dark:hover:text-white" to="/discover">
              Discover
            </Link>
            <Link className="block transition-colors hover:text-slate-900 dark:hover:text-white" to="/create-profile">
              Create Profile
            </Link>
            <Link className="block transition-colors hover:text-slate-900 dark:hover:text-white" to="/launch">
              Launch Subscription
            </Link>
          </div>
        </div>

        <div>
          <h4 className="font-body text-base font-semibold text-slate-900 dark:text-white">Initia Features</h4>
          <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <p>Auto-signing</p>
            <p>Interwoven Bridge</p>
            <p>.init usernames</p>
          </div>
        </div>

        <div>
          <h4 className="font-body text-base font-semibold text-slate-900 dark:text-white">Learn More</h4>
          <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
            <a
              className="block transition-colors hover:text-slate-900 dark:hover:text-white"
              href="https://initia.xyz"
              target="_blank"
              rel="noreferrer"
            >
              About Initia
            </a>
            <a
              className="block transition-colors hover:text-slate-900 dark:hover:text-white"
              href="https://docs.initia.xyz"
              target="_blank"
              rel="noreferrer"
            >
              Documentation
            </a>
            <a
              className="block transition-colors hover:text-slate-900 dark:hover:text-white"
              href="https://app.testnet.initia.xyz/usernames"
              target="_blank"
              rel="noreferrer"
            >
              Register .init
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-body text-base font-semibold text-slate-900 dark:text-white">Connect</h4>
          <div className="mt-4 flex gap-3 text-sm text-slate-500 dark:text-slate-400">
            <a
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white transition-transform hover:scale-105 dark:border-white/10 dark:bg-white/5"
              href="#"
            >
              X
            </a>
            <a
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white transition-transform hover:scale-105 dark:border-white/10 dark:bg-white/5"
              href="#"
            >
              G
            </a>
            <a
              className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white transition-transform hover:scale-105 dark:border-white/10 dark:bg-white/5"
              href="#"
            >
              M
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 border-t border-black/10 px-6 py-6 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <p>© 2026 Creato3. Zero platform fees, powered by blockchain.</p>
        <p>
          Built on{' '}
          <a
            className="font-semibold text-emerald-500 transition-colors hover:text-emerald-400"
            href="https://initia.xyz"
            target="_blank"
            rel="noreferrer"
          >
            Initia
          </a>
        </p>
      </div>
    </footer>
  )
}
