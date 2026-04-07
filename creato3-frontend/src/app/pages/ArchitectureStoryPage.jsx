import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckIcon,
  DollarSignIcon,
  GlobeIcon,
  LinkIcon,
  MessageCircleIcon,
  RepeatIcon,
  ShieldIcon,
  SparklesIcon,
  UploadIcon,
  UserCircleIcon,
  UsersIcon,
  WalletIcon,
  ZapIcon
} from '../components/icons'

const toneClasses = {
  green:
    'border-[#86efac]/40 bg-gradient-to-br from-[#d1fae5]/90 via-white/95 to-[#a7f3d0]/55 text-[#14532d]',
  blue:
    'border-[#93c5fd]/40 bg-gradient-to-br from-[#dbeafe]/90 via-white/95 to-[#bfdbfe]/55 text-[#1d4ed8]',
  violet:
    'border-[#c4b5fd]/40 bg-gradient-to-br from-[#ede9fe]/90 via-white/95 to-[#ddd6fe]/60 text-[#6d28d9]',
  amber:
    'border-[#fdba74]/40 bg-gradient-to-br from-[#ffedd5]/90 via-white/95 to-[#fed7aa]/60 text-[#9a3412]'
}

const storySteps = [
  {
    id: 'problem',
    chapter: 'Chapter 1',
    label: 'Why Creato3',
    icon: DollarSignIcon,
    title: 'Creators want direct revenue, not another platform tax',
    summary:
      'Creato3 starts with a simple product goal: fans should pay creators directly, while the product still feels as smooth as a Web2 subscription app.',
    bullets: [
      'Fans expect one tap access, not a complicated wallet ritual.',
      'Creators want identity, recurring income, and control over their audience.',
      'So the stack must remove middlemen without making blockchain visible at every step.'
    ],
    files: ['Product flow', 'Landing + creator journey', 'Subscription UX'],
    insight:
      'Everything else in the architecture exists to make that promise real: direct payment, clear identity, and low-friction onboarding.'
  },
  {
    id: 'initia',
    chapter: 'Chapter 2',
    label: 'Initia Layer',
    icon: ShieldIcon,
    title: 'Initia provides the smooth UX layer around the chain',
    summary:
      'InterwovenKit gives the app its wallet connection, appchain awareness, .init usernames, bridge access, and auto-sign capability.',
    bullets: [
      'The app registers a custom chain called creato3-1 and makes it the default active chain.',
      'Wallet state, usernames, wallet modal, and bridge modal all come from Initia hooks.',
      'This lets the product feel guided and branded instead of forcing users into raw chain plumbing.'
    ],
    files: ['src/main.jsx', 'src/app/components/Navbar.jsx', 'src/app/pages/SubscribePage.jsx'],
    insight:
      'Initia is not just the settlement layer here. It is also the UX layer that makes the appchain approachable for normal users.'
  },
  {
    id: 'execution',
    chapter: 'Chapter 3',
    label: 'Tx Flow',
    icon: ZapIcon,
    title: 'User actions become Initia messages that call EVM contracts',
    summary:
      'When someone creates a profile, launches a tier, or subscribes, the frontend ABI-encodes contract calldata and wraps it in Initia MsgCall transactions.',
    bullets: [
      'React pages prepare contract function data with ethers interfaces.',
      'buildMsgCall turns that calldata into /minievm.evm.v1.MsgCall for the Initia appchain.',
      'requestTxSync sends the message to creato3-1, where miniEVM executes the Solidity contracts.'
    ],
    files: ['src/utils/msgCall.js', 'src/app/pages/CreateProfilePage.jsx', 'src/app/pages/LaunchPage.jsx'],
    insight:
      'So Creato3 feels like a normal web app, but under the hood every meaningful action is a signed appchain transaction.'
  },
  {
    id: 'bootstrap',
    chapter: 'Chapter 4',
    label: 'First-Time Users',
    icon: RepeatIcon,
    title: 'New accounts are auto-activated before their first real transaction',
    summary:
      'A brand-new Initia address may not exist yet on creato3-1. Instead of making users bridge dust manually, the app now prepares the account automatically.',
    bullets: [
      'The frontend preflights every important transaction with an account bootstrap helper.',
      'A local gas station sends a tiny sponsor transfer if the appchain account is missing.',
      'Once the account exists, the original transaction is retried and the user continues normally.'
    ],
    files: ['src/utils/accountBootstrap.js', 'src/api/accountBootstrap.js', 'dev/bootstrapAccountPlugin.js'],
    insight:
      'This is the key onboarding trick: new users should feel guided into the chain, not blocked by chain setup details.'
  },
  {
    id: 'contracts',
    chapter: 'Chapter 5',
    label: 'On-Chain Logic',
    icon: LinkIcon,
    title: 'Smart contracts keep the business rules simple and transparent',
    summary:
      'The product logic is split into creator identity, subscription payments, and payout routing, so the architecture stays legible end to end.',
    bullets: [
      'CreatorProfile registers creators and stores their tiers on-chain.',
      'SubscriptionManager records fan subscriptions and renewals, then forwards value to treasury.',
      'Because msg.sender matters, the user wallet still owns the action even when onboarding is sponsored.'
    ],
    files: ['creato3/src/CreatorProfile.sol', 'creato3/src/SubscriptionManager.sol', 'creato3/src/Treasury.sol'],
    insight:
      'This gives Creato3 the real Web3 property we care about: creators and subscribers act with their own accounts, not a custodial backend.'
  },
  {
    id: 'experience',
    chapter: 'Chapter 6',
    label: 'User Outcome',
    icon: SparklesIcon,
    title: 'The final experience feels like a product story, not a protocol demo',
    summary:
      'A creator connects a wallet, claims identity, launches a membership tier, and a fan subscribes with a flow that hides most chain complexity.',
    bullets: [
      'Creators keep their identity and revenue path on-chain.',
      'Fans get recognizable usernames, bridge support, and a guided payment flow.',
      'The product can keep adding smoother Initia-native features without changing the core story.'
    ],
    files: ['src/app/pages/CreatorPage.jsx', 'src/app/pages/SubscribePage.jsx', '.initia/submission.json'],
    insight:
      'The architectural win is not that blockchain is visible everywhere. It is that ownership stays on-chain while the UX stays human.'
  }
]

const layerCards = [
  {
    title: 'Frontend Story Layer',
    description:
      'ZIP-style React pages, guided flows, and animated UI keep the product understandable for creators and fans.',
    refs: ['src/app/App.jsx', 'src/app/pages/*']
  },
  {
    title: 'Initia UX Layer',
    description:
      'InterwovenKit handles chain context, wallets, usernames, bridge access, and auto-sign capabilities.',
    refs: ['src/main.jsx', 'src/app/components/Navbar.jsx']
  },
  {
    title: 'Appchain Execution Layer',
    description:
      'Transactions are sent to creato3-1 as MsgCall messages that execute on miniEVM.',
    refs: ['src/utils/msgCall.js', 'src/config/contracts.js']
  },
  {
    title: 'Contract Logic Layer',
    description:
      'Creator profiles, subscription state, and payout routing live in Solidity contracts.',
    refs: ['creato3/src/CreatorProfile.sol', 'creato3/src/SubscriptionManager.sol']
  }
]

function SceneShell({ children, accent }) {
  return (
    <div
      className={`relative min-h-[420px] overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-br ${accent} p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] dark:border-[rgba(255,255,255,0.08)]`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)',
          backgroundSize: '44px 44px'
        }}
      />
      <Motion.div
        aria-hidden="true"
        className="absolute -left-10 top-8 h-40 w-40 rounded-full bg-[#a7f3d0]/30 blur-3xl"
        animate={{ x: [0, 20, -8, 0], y: [0, -18, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.div
        aria-hidden="true"
        className="absolute -right-8 bottom-2 h-40 w-40 rounded-full bg-[#93c5fd]/25 blur-3xl"
        animate={{ x: [0, -24, 10, 0], y: [0, 16, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <Motion.div
        aria-hidden="true"
        className="absolute left-1/2 top-10 h-24 w-24 rounded-full bg-white/40 blur-2xl"
        animate={{ scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  )
}

function NodeCard({ icon, title, subtitle, tone = 'green', className = '' }) {
  const IconComponent = icon
  const iconMarkup = IconComponent ? <IconComponent className="h-5 w-5" /> : null

  return (
    <Motion.div
      className={`rounded-[28px] border p-4 shadow-lg backdrop-blur ${toneClasses[tone]} ${className}`}
      animate={{ y: [0, -8, 0, 6, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80">{iconMarkup}</div>
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[#4b5563]">{subtitle}</p>
    </Motion.div>
  )
}

function FlowLine({ className, orientation = 'horizontal', delay = 0 }) {
  return (
    <div
      className={`absolute overflow-hidden rounded-full bg-[rgba(15,23,42,0.1)] ${className} dark:bg-[rgba(255,255,255,0.12)]`}
    >
      <Motion.span
        className={`absolute rounded-full bg-gradient-to-r from-[#6ee7b7] to-[#93c5fd] ${
          orientation === 'horizontal'
            ? 'top-1/2 h-2 w-16 -translate-y-1/2'
            : 'left-1/2 h-16 w-2 -translate-x-1/2'
        }`}
        animate={orientation === 'horizontal' ? { x: ['-20%', '110%'] } : { y: ['-20%', '110%'] }}
        transition={{ duration: 1.9, repeat: Infinity, ease: 'easeInOut', delay }}
      />
    </div>
  )
}

function OrbitChip({ icon, label, className }) {
  const IconComponent = icon
  const iconMarkup = IconComponent ? <IconComponent className="h-4 w-4" /> : null

  return (
    <div
      className={`absolute flex items-center gap-2 rounded-full border border-white/70 bg-white/85 px-2.5 py-1.5 text-xs font-medium text-[#1f2937] shadow-lg md:px-3 md:py-2 md:text-sm ${className}`}
    >
      {iconMarkup}
      <span>{label}</span>
    </div>
  )
}

function MiniCard({ title, subtitle, icon, className = '' }) {
  const IconComponent = icon
  const iconMarkup = IconComponent ? <IconComponent className="h-5 w-5 text-[#1f2937]" /> : null

  return (
    <div
      className={`rounded-[24px] border border-white/70 bg-white/85 p-4 text-left shadow-lg backdrop-blur ${className}`}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a7f3d0]/40 to-[#93c5fd]/40">{iconMarkup}</div>
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">{subtitle}</p>
    </div>
  )
}

function ProblemScene() {
  return (
    <SceneShell accent="from-[#fff9ef] via-white to-[#eef6ff]">
      <div className="grid gap-4 pt-10 md:grid-cols-3">
        <NodeCard
          className="md:mt-16"
          icon={UsersIcon}
          title="Fans"
          subtitle="Want instant access and recognizable creator identities."
          tone="blue"
        />
        <NodeCard
          className="md:mt-2"
          icon={DollarSignIcon}
          title="Platform Toll"
          subtitle="Sits in the middle, owns the audience relationship, and takes a cut."
          tone="amber"
        />
        <NodeCard
          className="md:mt-16"
          icon={SparklesIcon}
          title="Creators"
          subtitle="Should keep the revenue and build direct membership businesses."
          tone="green"
        />
      </div>

      <FlowLine className="hidden md:block left-[30%] top-[51%] h-[2px] w-[16%]" delay={0.1} />
      <FlowLine className="hidden md:block left-[54%] top-[51%] h-[2px] w-[16%]" delay={0.8} />

      <Motion.div
        className="absolute left-1/2 top-[27%] hidden -translate-x-1/2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-semibold text-[#9a3412] shadow-lg md:block"
        animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        revenue leaks here
      </Motion.div>

      <Motion.div
        className="absolute bottom-10 left-8 hidden rounded-full bg-[#dbeafe]/80 px-4 py-2 text-xs font-medium text-[#1d4ed8] md:block"
        animate={{ x: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        smooth UX still matters
      </Motion.div>
      <Motion.div
        className="absolute bottom-10 right-8 hidden rounded-full bg-[#d1fae5]/85 px-4 py-2 text-xs font-medium text-[#14532d] md:block"
        animate={{ x: [0, -12, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        ownership should stay with creators
      </Motion.div>
    </SceneShell>
  )
}

function InitiaScene() {
  return (
    <SceneShell accent="from-[#eff6ff] via-white to-[#f5f3ff]">
      <div className="relative flex min-h-[380px] items-center justify-center">
        <Motion.div
          aria-hidden="true"
          className="absolute h-[260px] w-[260px] rounded-full border border-white/70 md:h-[300px] md:w-[300px]"
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
        />
        <Motion.div
          aria-hidden="true"
          className="absolute h-[190px] w-[190px] rounded-full border border-white/70 md:h-[220px] md:w-[220px]"
          animate={{ rotate: -360 }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />

        <OrbitChip className="left-1/2 top-6 -translate-x-1/2 md:top-10" icon={UserCircleIcon} label=".init" />
        <OrbitChip className="right-2 top-1/2 -translate-y-1/2 md:right-8" icon={RepeatIcon} label="Bridge" />
        <OrbitChip className="bottom-6 left-1/2 -translate-x-1/2 md:bottom-10" icon={ShieldIcon} label="Auto-sign" />
        <OrbitChip className="left-2 top-1/2 -translate-y-1/2 md:left-8" icon={WalletIcon} label="Wallet UX" />

        <Motion.div
          className="relative z-10 w-full max-w-[260px] rounded-[34px] border border-white/80 bg-white/90 p-6 text-center shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
          animate={{ scale: [1, 1.02, 1], rotate: [0, 1.2, 0, -1.2, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-[#a7f3d0] to-[#93c5fd]">
            <SparklesIcon className="h-7 w-7 text-[#111827]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7280]">Initia</p>
          <h3 className="mt-2 text-xl text-[#111827]">Interwoven UX layer</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">
            One provider gives chain context, usernames, bridge access, and wallet controls.
          </p>
        </Motion.div>
      </div>
    </SceneShell>
  )
}

function ExecutionScene() {
  return (
    <SceneShell accent="from-[#f0fdf4] via-white to-[#eff6ff]">
      <div className="grid min-h-[380px] gap-3 md:hidden">
        <MiniCard icon={GlobeIcon} title="React page" subtitle="User taps a product action." />
        <MiniCard icon={WalletIcon} title="InterwovenKit" subtitle="Supplies chain-aware wallet state." />
        <MiniCard icon={ZapIcon} title="MsgCall" subtitle="Calldata is wrapped for miniEVM." />
        <MiniCard icon={ShieldIcon} title="creato3-1" subtitle="Initia appchain receives the tx." />
        <MiniCard icon={LinkIcon} title="Contracts" subtitle="Solidity logic executes on-chain." />
      </div>

      <div className="hidden min-h-[380px] items-center justify-between gap-3 md:flex">
        <MiniCard
          className="w-[18%]"
          icon={GlobeIcon}
          title="React page"
          subtitle="User taps Complete Profile, Launch, or Subscribe."
        />
        <MiniCard
          className="w-[18%]"
          icon={WalletIcon}
          title="InterwovenKit"
          subtitle="Supplies the Initia address and sends the transaction."
        />
        <MiniCard
          className="w-[18%]"
          icon={ZapIcon}
          title="MsgCall"
          subtitle="ABI calldata is wrapped for the miniEVM appchain."
        />
        <MiniCard
          className="w-[18%]"
          icon={ShieldIcon}
          title="creato3-1"
          subtitle="The custom Initia chain receives and routes the message."
        />
        <MiniCard
          className="w-[18%]"
          icon={LinkIcon}
          title="Contracts"
          subtitle="CreatorProfile and SubscriptionManager execute the logic."
        />
      </div>

      <FlowLine className="hidden md:block left-[18%] top-1/2 h-[2px] w-[8%]" delay={0.1} />
      <FlowLine className="hidden md:block left-[37%] top-1/2 h-[2px] w-[8%]" delay={0.45} />
      <FlowLine className="hidden md:block left-[56%] top-1/2 h-[2px] w-[8%]" delay={0.8} />
      <FlowLine className="hidden md:block left-[75%] top-1/2 h-[2px] w-[8%]" delay={1.15} />

      <Motion.div
        className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-semibold text-[#111827] shadow-lg"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        requestTxSync + /minievm.evm.v1.MsgCall
      </Motion.div>
    </SceneShell>
  )
}

function BootstrapScene() {
  return (
    <SceneShell accent="from-[#fefce8] via-white to-[#ecfeff]">
      <div className="grid min-h-[380px] gap-4 md:grid-cols-4">
        <NodeCard
          className="md:mt-16"
          icon={WalletIcon}
          title="New wallet"
          subtitle="A fresh init1 address may not exist yet on creato3-1."
          tone="blue"
        />
        <NodeCard
          className="md:mt-8"
          icon={RepeatIcon}
          title="Bootstrap check"
          subtitle="Before the real tx, the app asks whether the account already exists."
          tone="amber"
        />
        <NodeCard
          className="md:mt-8"
          icon={ZapIcon}
          title="Gas station"
          subtitle="A tiny sponsor transfer activates the missing account automatically."
          tone="green"
        />
        <NodeCard
          className="md:mt-16"
          icon={CheckIcon}
          title="Retry original tx"
          subtitle="Once the account appears, the profile or subscription tx continues."
          tone="violet"
        />
      </div>

      <FlowLine className="hidden md:block left-[22%] top-[52%] h-[2px] w-[10%]" delay={0.1} />
      <FlowLine className="hidden md:block left-[46%] top-[52%] h-[2px] w-[10%]" delay={0.6} />
      <FlowLine className="hidden md:block left-[70%] top-[52%] h-[2px] w-[10%]" delay={1.1} />

      <Motion.div
        className="absolute left-1/2 top-10 -translate-x-1/2 rounded-full bg-[#111827] px-4 py-2 text-xs font-semibold text-white shadow-xl"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        no manual dust funding required
      </Motion.div>
    </SceneShell>
  )
}

function ContractsScene() {
  return (
    <SceneShell accent="from-[#eef2ff] via-white to-[#f0fdf4]">
      <div className="grid min-h-[380px] gap-4 md:hidden">
        <NodeCard
          icon={UserCircleIcon}
          title="CreatorProfile"
          subtitle="Registers creators and stores active tiers."
          tone="violet"
        />
        <NodeCard
          icon={LinkIcon}
          title="SubscriptionManager"
          subtitle="Checks the selected tier, records the membership, and routes payment."
          tone="blue"
        />
        <NodeCard
          icon={DollarSignIcon}
          title="Treasury"
          subtitle="Receives the value path so payouts stay transparent."
          tone="green"
        />
        <NodeCard
          icon={UploadIcon}
          title="Access result"
          subtitle="The fan gets entitlement and the creator gets a direct subscription business."
          tone="amber"
        />
      </div>

      <div className="relative hidden min-h-[380px] md:block">
        <NodeCard
          className="absolute left-4 top-12 w-[34%]"
          icon={UserCircleIcon}
          title="CreatorProfile"
          subtitle="Registers creators and stores membership tiers on-chain."
          tone="violet"
        />
        <NodeCard
          className="absolute right-4 top-12 w-[34%]"
          icon={DollarSignIcon}
          title="Treasury"
          subtitle="Receives routed payments so creator revenue is handled transparently."
          tone="green"
        />
        <NodeCard
          className="absolute left-1/2 top-1/2 w-[40%] -translate-x-1/2 -translate-y-1/2"
          icon={LinkIcon}
          title="SubscriptionManager"
          subtitle="Validates the active tier, records the subscription, and forwards payment."
          tone="blue"
        />
        <NodeCard
          className="absolute bottom-8 left-1/2 w-[46%] -translate-x-1/2"
          icon={UploadIcon}
          title="Access result"
          subtitle="The user now has entitlement, and the creator has an on-chain membership business."
          tone="amber"
        />

        <FlowLine className="left-[34%] top-[34%] h-[2px] w-[17%]" delay={0.1} />
        <FlowLine className="left-[49%] top-[34%] h-[2px] w-[17%]" delay={0.7} />
        <FlowLine
          className="left-1/2 top-[58%] h-[12%] w-[2px] -translate-x-1/2"
          delay={1.2}
          orientation="vertical"
        />
      </div>
    </SceneShell>
  )
}

function ExperienceScene() {
  return (
    <SceneShell accent="from-[#ecfeff] via-white to-[#f5f3ff]">
      <div className="grid min-h-[380px] items-center gap-5 lg:grid-cols-[0.9fr,1.2fr,0.9fr]">
        <NodeCard
          icon={SparklesIcon}
          title="Creator story"
          subtitle="Connect wallet, claim identity, launch a tier, and keep the relationship."
          tone="green"
        />

        <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7280]">
            What users feel
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniCard icon={WalletIcon} title="Connect" subtitle="One branded wallet flow." />
            <MiniCard icon={UserCircleIcon} title=".init" subtitle="Human-readable identity." />
            <MiniCard icon={ShieldIcon} title="Smooth tx" subtitle="Appchain-native signing path." />
            <MiniCard icon={MessageCircleIcon} title="Access" subtitle="Subscribers reach premium content fast." />
          </div>
        </div>

        <NodeCard
          icon={UsersIcon}
          title="Fan story"
          subtitle="Bridge if needed, pay once, and get a guided recurring membership flow."
          tone="blue"
        />
      </div>

      <Motion.div
        className="absolute bottom-6 left-1/2 flex max-w-[90%] -translate-x-1/2 flex-wrap justify-center gap-3 rounded-full border border-white/80 bg-white/90 px-5 py-3 text-xs font-semibold text-[#111827] shadow-lg md:bottom-10"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span>identity</span>
        <span>payments</span>
        <span>access</span>
        <span>ownership</span>
      </Motion.div>
    </SceneShell>
  )
}

const sceneById = {
  problem: ProblemScene,
  initia: InitiaScene,
  execution: ExecutionScene,
  bootstrap: BootstrapScene,
  contracts: ContractsScene,
  experience: ExperienceScene
}

export function ArchitectureStoryPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const activeStep = storySteps[currentStep]
  const ActiveScene = sceneById[activeStep.id]
  const ActiveIcon = activeStep.icon
  const isFirst = currentStep === 0
  const isLast = currentStep === storySteps.length - 1

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'ArrowRight') {
        setCurrentStep((prev) => Math.min(prev + 1, storySteps.length - 1))
      }

      if (event.key === 'ArrowLeft') {
        setCurrentStep((prev) => Math.max(prev - 1, 0))
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8fafc] via-white to-[#f3f8ff] pb-24 pt-24 dark:from-[#101422] dark:via-[#121a2e] dark:to-[#16213e]">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(167,243,208,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(147,197,253,0.18),_transparent_35%)]" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.08)] bg-white/80 px-4 py-2 text-sm text-[#111827] shadow-sm backdrop-blur dark:border-[rgba(255,255,255,0.08)] dark:bg-white/5 dark:text-white">
              <SparklesIcon className="h-4 w-4 text-[#6ee7b7]" />
              Guided architecture story
            </div>
            <h1 className="mt-6 text-5xl leading-tight text-[#111827] dark:text-white md:text-6xl">
              How Initia powers Creato3 from first click to final payout
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
              Press next through a story-first architecture tour. We move from the creator problem,
              into Initia&apos;s UX layer, through appchain execution, and down to the contracts.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-[40px] border border-[rgba(15,23,42,0.08)] bg-white/80 shadow-[0_35px_120px_rgba(15,23,42,0.08)] backdrop-blur dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(17,24,39,0.72)]">
            <div className="flex flex-col gap-5 border-b border-[rgba(15,23,42,0.08)] px-6 py-6 dark:border-[rgba(255,255,255,0.08)] lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6b7280] dark:text-[#9ca3af]">
                  Step {currentStep + 1} of {storySteps.length}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {storySteps.map((step, index) => (
                    <button
                      key={step.id}
                      className={`rounded-full px-4 py-2 text-sm transition-all ${
                        index === currentStep
                          ? 'bg-[#111827] text-white shadow-lg dark:bg-white dark:text-[#111827]'
                          : 'border border-[rgba(15,23,42,0.08)] bg-white/70 text-[#4b5563] hover:border-[#93c5fd] hover:text-[#111827] dark:border-[rgba(255,255,255,0.08)] dark:bg-white/5 dark:text-[#d1d5db] dark:hover:text-white'
                      }`}
                      onClick={() => setCurrentStep(index)}
                      type="button"
                    >
                      {index + 1}. {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[26px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20 px-5 py-4 shadow-sm dark:border-[rgba(255,255,255,0.08)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/85">
                  <ActiveIcon className="h-5 w-5 text-[#111827]" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280] dark:text-[#9ca3af]">
                    current scene
                  </p>
                  <p className="text-sm font-semibold text-[#111827] dark:text-white">
                    {activeStep.label}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.15fr,0.85fr]">
              <AnimatePresence mode="wait">
                <Motion.div
                  key={`${activeStep.id}-scene`}
                  animate={{ opacity: 1, x: 0 }}
                  className="h-full"
                  exit={{ opacity: 0, x: -24 }}
                  initial={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                >
                  <ActiveScene />
                </Motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <Motion.div
                  key={`${activeStep.id}-content`}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-[#f8fbff] p-6 shadow-lg dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)]"
                  exit={{ opacity: 0, y: 20 }}
                  initial={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#6b7280] dark:text-[#9ca3af]">
                    {activeStep.chapter}
                  </p>
                  <h2 className="mt-3 text-3xl leading-tight text-[#111827] dark:text-white">
                    {activeStep.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                    {activeStep.summary}
                  </p>

                  <div className="mt-6 space-y-3">
                    {activeStep.bullets.map((bullet) => (
                      <div
                        key={bullet}
                        className="flex items-start gap-3 rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white/80 p-4 dark:border-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.02)]"
                      >
                        <div className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd]">
                          <CheckIcon className="h-3.5 w-3.5 text-[#111827]" />
                        </div>
                        <p className="text-sm leading-relaxed text-[#4b5563] dark:text-[#d1d5db]">
                          {bullet}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6b7280] dark:text-[#9ca3af]">
                      Where this lives in the codebase
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeStep.files.map((file) => (
                        <span
                          key={file}
                          className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-2 font-mono text-xs text-[#374151] shadow-sm dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.04)] dark:text-[#d1d5db]"
                        >
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-[28px] bg-gradient-to-r from-[#111827] to-[#1f2937] p-5 text-white shadow-xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                      Why it matters
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-white/85">
                      {activeStep.insight}
                    </p>
                  </div>
                </Motion.div>
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-4 border-t border-[rgba(15,23,42,0.08)] px-6 py-5 dark:border-[rgba(255,255,255,0.08)] sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Tip: use your left and right arrow keys or just keep tapping next to follow the
                architecture like a product story.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  className={`rounded-full px-5 py-3 text-sm font-medium transition-all ${
                    isFirst
                      ? 'cursor-not-allowed border border-[rgba(15,23,42,0.08)] bg-[#f3f4f6] text-[#9ca3af] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.04)]'
                      : 'border border-[rgba(15,23,42,0.08)] bg-white text-[#111827] shadow-sm hover:-translate-y-0.5 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.04)] dark:text-white'
                  }`}
                  disabled={isFirst}
                  onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                  type="button"
                >
                  Back
                </button>

                {isLast ? (
                  <>
                    <button
                      className="rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-5 py-3 text-sm font-medium text-[#111827] shadow-sm transition-all hover:-translate-y-0.5 dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.04)] dark:text-white"
                      onClick={() => setCurrentStep(0)}
                      type="button"
                    >
                      Replay story
                    </button>
                    <Link
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-6 py-3 text-sm font-semibold text-[#111827] shadow-lg transition-all hover:-translate-y-0.5"
                      to="/create-profile"
                    >
                      Start building
                      <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-6 py-3 text-sm font-semibold text-[#111827] shadow-lg transition-all hover:-translate-y-0.5"
                    onClick={() => setCurrentStep((prev) => Math.min(prev + 1, storySteps.length - 1))}
                    type="button"
                  >
                    Next chapter
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-4xl text-[#111827] dark:text-white">The stack in one glance</h2>
              <p className="mt-4 text-lg text-[#6b7280] dark:text-[#9ca3af]">
                If the guided story is the movie, this is the architecture poster.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-4">
              {layerCards.map((card, index) => (
                <Motion.div
                  key={card.title}
                  animate={{ y: [0, -4, 0] }}
                  className="rounded-[28px] border border-[rgba(15,23,42,0.08)] bg-white/85 p-6 shadow-lg backdrop-blur dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.04)]"
                  transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <h3 className="text-xl text-[#111827] dark:text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#6b7280] dark:text-[#9ca3af]">
                    {card.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.refs.map((ref) => (
                      <span
                        key={ref}
                        className="rounded-full bg-gradient-to-r from-[#a7f3d0]/20 to-[#93c5fd]/20 px-3 py-2 font-mono text-xs text-[#374151] dark:text-[#d1d5db]"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </Motion.div>
              ))}
            </div>
          </div>

          <div className="mt-16 rounded-[36px] border border-[rgba(15,23,42,0.08)] bg-gradient-to-r from-[#111827] to-[#1f2937] p-8 text-white shadow-[0_30px_90px_rgba(15,23,42,0.24)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                  Ready to try the flow live
                </p>
                <h2 className="mt-3 text-3xl">See the story turn into product actions</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/75">
                  Create a profile, launch a membership tier, or browse the live creator
                  experience. The same architecture you just walked through powers those flows.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#111827] shadow-lg transition-transform hover:-translate-y-0.5"
                  to="/create-profile"
                >
                  Create profile
                </Link>
                <Link
                  className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                  to="/discover"
                >
                  Explore creators
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
