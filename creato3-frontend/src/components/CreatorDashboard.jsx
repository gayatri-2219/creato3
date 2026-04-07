import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../abis/CreatorProfile.json'
import CREATOR_TREASURY_ABI from '../abis/CreatorTreasury.json'
import SUBSCRIPTION_ABI from '../abis/SubscriptionManager.json'
import { CONTRACTS, CHAIN_ID, COSMOS_RPC, EVM_RPC, REST_API } from '../config/contracts'
import { publicClient } from '../config/evmClient'
import AIPricingAdvisor from './AIPricingAdvisor'
import { BridgeButton } from './BridgeButton'
import { Modal } from './Modal'
import { useToast } from './ToastProvider'
import { Skeleton } from './Skeleton'
import { AnimatedNumber } from './AnimatedNumber'
import {
  addCreatorContent,
  deleteCreatorContent,
  getCreatorContent,
  updateCreatorContent
} from '../utils/contentStore'
import { formatChainError, probeChainHealth, summarizeChainHealth } from '../utils/chainHealth'
import { getUsernameOverride, setUsernameOverride } from '../utils/usernameStore'
import { getSubscriptionConfig, saveSubscriptionConfig } from '../utils/subscriptionStore'
import { buildMsgCall, isInitiaAddress } from '../utils/msgCall'

const CATEGORY_OPTIONS = ['coding', 'music', 'writing', 'art', 'gaming', 'other']
const CONTENT_TYPES = [
  { value: 'text', label: 'Text / Newsletter' },
  { value: 'video', label: 'Video / Stream' },
  { value: 'image', label: 'Image / Gallery' },
  { value: 'pdf', label: 'PDF / Guide' },
  { value: 'link', label: 'Link / Resource' }
]

const CHANNEL_OPTIONS = ['YouTube', 'Twitter', 'Newsletter', 'Instagram', 'Twitch', 'Other']

const linkOptions = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'discord', label: 'Discord' },
  { key: 'website', label: 'Website' }
]

const formatInit = (value) => {
  try {
    return ethers.formatEther(value)
  } catch {
    return '0'
  }
}

const formatUinit = (amount) => {
  const numeric = Number(amount || 0) / 1e6
  if (Number.isNaN(numeric)) return '0'
  return numeric.toFixed(2)
}

const short = (value) =>
  value ? `${value.slice(0, 6)}...${value.slice(-4)}` : ''

const defaultContentForm = {
  title: '',
  type: 'text',
  summary: '',
  body: '',
  url: '',
  requiredTierId: 'public',
  published: true,
  fileName: '',
  fileType: '',
  fileDataUrl: ''
}

const buildContentPricing = (items, signals) => {
  const premiumItems = items.filter((item) => item.requiredTierId !== -1).length
  const typeSet = new Set(items.map((item) => item.type))
  const diversityBoost = Math.min(typeSet.size * 0.0006, 0.003)
  const audienceBoost = Math.min((signals.audience || 0) / 100000, 1) * 0.005
  const paidBoost = Math.min((signals.paidSubs || 0) / 500, 1) * 0.004
  const channelBoost =
    signals.channel === 'YouTube'
      ? 0.002
      : signals.channel === 'Newsletter'
        ? 0.0015
        : signals.channel === 'Twitch'
          ? 0.001
          : 0.0008

  const base = Math.min(0.03, 0.002 + premiumItems * 0.001 + diversityBoost + audienceBoost + paidBoost + channelBoost)

  return {
    insight:
      premiumItems === 0
        ? 'Add at least 2 premium posts to unlock stronger pricing recommendations.'
        : 'Pricing is tuned to your premium content volume, channel size, and paid subscribers.',
    tiers: [
      {
        name: 'Starter',
        price: base.toFixed(4),
        description: 'Starter access + weekly premium drops.'
      },
      {
        name: 'Studio',
        price: (base * 3).toFixed(4),
        description: 'Full archive + monthly live session.'
      },
      {
        name: 'Inner Circle',
        price: (base * 6).toFixed(4),
        description: 'Direct feedback + early access to everything.'
      }
    ]
  }
}

const buildPricingFromUploads = (uploads, signals) => {
  const count = uploads.length
  const typeSet = new Set(uploads.map((file) => file.category))
  const diversityBoost = Math.min(typeSet.size * 0.0006, 0.003)
  const audienceBoost = Math.min((signals.audience || 0) / 100000, 1) * 0.005
  const paidBoost = Math.min((signals.paidSubs || 0) / 500, 1) * 0.004
  const base = Math.min(0.03, 0.003 + count * 0.001 + diversityBoost + audienceBoost + paidBoost)
  const price = (base * 1000).toFixed(0)
  return {
    recommendedPrice: price,
    range: `₹${Math.max(99, Math.round(price * 0.6))} - ₹${Math.round(price * 1.4)}`,
    insight:
      count === 0
        ? 'Upload at least 2 premium assets so pricing can reflect your value.'
        : 'Pricing tuned to your content depth and audience signals.'
  }
}

export function CreatorDashboard() {
  const { address, initiaAddress, hexAddress, username, requestTxSync, openConnect } =
    useInterwovenKit()
  const kitInitiaAddress = useInitiaAddress()
  const toast = useToast()
  const evmAddress = hexAddress || address
  const [senderOverride, setSenderOverride] = useState('')
  const connectedInitiaAddress = (kitInitiaAddress || initiaAddress || '').trim()
  const senderAddress = (
    import.meta.env.VITE_SENDER_OVERRIDE ||
    senderOverride ||
    connectedInitiaAddress ||
    ''
  ).trim()
  const [registered, setRegistered] = useState(false)
  const [creator, setCreator] = useState(null)
  const [tiers, setTiers] = useState([])
  const [tierIds, setTierIds] = useState([])
  const [subscribers, setSubscribers] = useState([])

  const [showAI, setShowAI] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    bio: '',
    category: 'coding',
    initUsername: '',
    channelLink: ''
  })
  const [tierForm, setTierForm] = useState({
    name: '',
    price: '',
    description: ''
  })
  const [editTier, setEditTier] = useState(null)
  const [status, setStatus] = useState('')

  const [balances, setBalances] = useState({
    earned: '0',
    withdrawable: '0'
  })
  const [l2Balance, setL2Balance] = useState(null)
  const [l1Balance, setL1Balance] = useState(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const [contentItems, setContentItems] = useState([])
  const [contentForm, setContentForm] = useState(defaultContentForm)
  const [editContent, setEditContent] = useState(null)
  const [contentPricing, setContentPricing] = useState(null)
  const [uploadHint, setUploadHint] = useState('')
  const [contentSignals, setContentSignals] = useState({
    channel: 'YouTube',
    audience: 5000,
    paidSubs: 0
  })
  const [usernameOverrideValue, setUsernameOverrideValue] = useState('')
  const canRegister = Boolean(senderAddress)
  const senderLooksValid = isInitiaAddress(senderAddress)

  const [uploads, setUploads] = useState([])
  const [subscriptionForm, setSubscriptionForm] = useState({
    niche: '',
    audience: 100,
    paidSubs: 0,
    manualPrice: '',
    links: {
      youtube: '',
      twitter: '',
      telegram: '',
      discord: '',
      website: ''
    }
  })
  const [pricingSuggestion, setPricingSuggestion] = useState(null)
  const [chainHealth, setChainHealth] = useState({
    loading: true,
    ok: false,
    results: []
  })

  const stats = useMemo(() => {
    const active = subscribers.filter((s) => s.expiry > Date.now()).length
    const month = subscribers.filter(
      (s) => s.timestamp > Date.now() - 1000 * 60 * 60 * 24 * 30
    ).length
    return { active, month }
  }, [subscribers])

  const refreshChainHealth = async () => {
    const next = await probeChainHealth()
    setChainHealth({
      loading: false,
      ...next
    })
    return next
  }

  useEffect(() => {
    if (!address) return
    const stored = getCreatorContent(address)
    setContentItems(stored)
  }, [address, status])

  useEffect(() => {
    if (!address) return
    const existing = getSubscriptionConfig(address)
    if (existing) {
      setUploads(existing.uploads || [])
      setSubscriptionForm((prev) => ({
        ...prev,
        niche: existing.niche || '',
        audience: existing.audience || prev.audience,
        paidSubs: existing.paidSubs || 0,
        manualPrice: existing.price || '',
        links: { ...prev.links, ...(existing.links || {}) }
      }))
      setPricingSuggestion(existing.suggestion || null)
    }
  }, [address])

  useEffect(() => {
    const key = initiaAddress || address
    if (!key) return
    setUsernameOverrideValue(getUsernameOverride(key))
  }, [initiaAddress, address])

  useEffect(() => {
    const stored = localStorage.getItem('creato3.senderOverride') || ''
    if (stored && !stored.startsWith('init1')) {
      localStorage.removeItem('creato3.senderOverride')
      setSenderOverride('')
      return
    }
    setSenderOverride(stored)
  }, [])

  useEffect(() => {
    let active = true

    const loadHealth = async () => {
      const next = await probeChainHealth()

      if (!active) {
        return
      }

      setChainHealth({
        loading: false,
        ...next
      })
    }

    loadHealth()
    const interval = setInterval(loadHealth, 20000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!initiaAddress) return
    let active = true

    const loadL1Balance = async () => {
      try {
        const res = await fetch(
          `https://rest.testnet.initia.xyz/cosmos/bank/v1beta1/balances/${initiaAddress}`
        )
        const data = await res.json()
        const amount =
          data?.balances?.find((balance) => balance.denom === 'uinit')?.amount || '0'
        if (active) setL1Balance(Number(amount))
      } catch (err) {
        if (active) setL1Balance(null)
      }
    }

    loadL1Balance()
    const interval = setInterval(loadL1Balance, 20000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [initiaAddress])

  useEffect(() => {
    if (!evmAddress) return
    const load = async () => {
      try {
        setLoadingStats(true)
        const isReg = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'isRegistered',
          args: [evmAddress]
        })
        setRegistered(isReg)
        if (isReg) {
          const data = await publicClient.readContract({
            address: CONTRACTS.profile,
            abi: CREATOR_PROFILE_ABI,
            functionName: 'getCreator',
            args: [evmAddress]
          })
          setCreator(data)
          const [tierList, ids] = await publicClient.readContract({
            address: CONTRACTS.profile,
            abi: CREATOR_PROFILE_ABI,
            functionName: 'getActiveTiers',
            args: [evmAddress]
          })
          setTiers(tierList)
          setTierIds(ids)

          const earned = await publicClient.readContract({
            address: CONTRACTS.treasury,
            abi: CREATOR_TREASURY_ABI,
            functionName: 'getTotalEarned',
            args: [evmAddress]
          })
          const withdrawable = await publicClient.readContract({
            address: CONTRACTS.treasury,
            abi: CREATOR_TREASURY_ABI,
            functionName: 'getBalance',
            args: [evmAddress]
          })
          setBalances({
            earned: formatInit(earned),
            withdrawable: formatInit(withdrawable)
          })

          const logs = await publicClient.getLogs({
            address: CONTRACTS.subscription,
            event: SUBSCRIPTION_ABI.find((e) => e.name === 'Subscribed'),
            fromBlock: 0n,
            toBlock: 'latest'
          })
          const mapped = logs
            .map((log) => {
              const args = log.args || {}
              return {
                subscriber: args.subscriber,
                creator: args.creator,
                tierId: Number(args.tierId || 0),
                expiry: Number(args.expiry || 0) * 1000,
                timestamp: Number(log.blockNumber || 0)
              }
            })
              .filter((log) => log.creator?.toLowerCase() === evmAddress.toLowerCase())
          setSubscribers(mapped)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingStats(false)
      }
    }

    load()
  }, [evmAddress, status])

  useEffect(() => {
    if (!evmAddress) return
    let active = true
    const loadBalance = async () => {
      try {
        const value = await publicClient.getBalance({ address: evmAddress })
        if (active) setL2Balance(value)
      } catch {
        if (active) setL2Balance(null)
      }
    }
    loadBalance()
    const interval = setInterval(loadBalance, 15000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [evmAddress])

  const sendMsgCall = async ({ input, value = '0', contractAddr = CONTRACTS.profile }) => {
    if (!senderAddress || !senderLooksValid) {
      throw new Error('Sender address missing or invalid (must start with init1...).')
    }
    if (!contractAddr) {
      throw new Error('Contract address missing. Check your .env and restart Vite.')
    }

    const latestHealth = chainHealth.ok ? chainHealth : await refreshChainHealth()

    if (!latestHealth.ok) {
      throw new Error(summarizeChainHealth(latestHealth))
    }

    const msg = buildMsgCall({ sender: senderAddress, contractAddr, input, value })

    try {
      await requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
    } catch (error) {
      const nextHealth = await refreshChainHealth().catch(() => latestHealth)
      throw new Error(formatChainError(error, nextHealth, 'submit the transaction'))
    }
  }

  const handleRegister = async () => {
    setStatus('registering')
    try {
      if (!senderAddress) {
        toast.error('Connect wallet', 'Please connect your Initia wallet first.')
        openConnect?.()
        setStatus('error')
        return
      }
      const iface = new ethers.Interface(CREATOR_PROFILE_ABI)
      const initName =
        registerForm.initUsername ||
        usernameOverrideValue ||
        username ||
        ''
      const data = iface.encodeFunctionData('registerCreator', [
        registerForm.displayName,
        registerForm.bio,
        registerForm.category,
        initName
      ])
      await sendMsgCall({ input: data })
      setStatus('registered')
      toast.success('Profile created', 'Your creator profile is now live.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Registration failed', err?.message || 'Please try again.')
    }
  }

  const handleCreateTier = async () => {
    setStatus('creating-tier')
    try {
      const iface = new ethers.Interface(CREATOR_PROFILE_ABI)
      const price = ethers.parseEther(tierForm.price || '0')
      const data = iface.encodeFunctionData('createTier', [
        price,
        tierForm.name,
        tierForm.description
      ])
      await sendMsgCall({ input: data })
      setTierForm({ name: '', price: '', description: '' })
      setStatus('tier-created')
      toast.success('Tier created', 'Your new tier is now live.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Tier creation failed', err?.message || 'Please try again.')
    }
  }

  const handleUpdateTier = async () => {
    if (!editTier) return
    setStatus('updating-tier')
    try {
      const iface = new ethers.Interface(CREATOR_PROFILE_ABI)
      const price = ethers.parseEther(editTier.price || '0')
      const data = iface.encodeFunctionData('updateTier', [
        editTier.tierId,
        price,
        editTier.name,
        editTier.description,
        editTier.active
      ])
      await sendMsgCall({ input: data })
      setEditTier(null)
      setStatus('tier-updated')
      toast.success('Tier updated', 'Changes saved successfully.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Update failed', err?.message || 'Please try again.')
    }
  }

  const handleWithdraw = async () => {
    setStatus('withdrawing')
    try {
      const iface = new ethers.Interface(CREATOR_TREASURY_ABI)
      const data = iface.encodeFunctionData('withdraw', [])
      const msg = buildMsgCall({
        sender: senderAddress,
        contractAddr: CONTRACTS.treasury,
        input: data,
        value: '0'
      })
      await requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
      setStatus('withdrawn')
      toast.success('Withdrawal complete', '100% of earnings sent to your wallet.')
    } catch (err) {
      console.error(err)
      setStatus('error')
      toast.error('Withdrawal failed', err?.message || 'Please try again.')
    }
  }

  const tierOptions = useMemo(() => {
    return tierIds.map((id, index) => ({
      id: Number(id),
      label: tiers[index]?.name || `Tier ${id}`
    }))
  }, [tierIds, tiers])

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const maxBytes = 2 * 1024 * 1024
    setUploadHint('')

    if (file.size > maxBytes) {
      setUploadHint('File is too large to preview. Use a link instead.')
      setContentForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type,
        fileDataUrl: ''
      }))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setContentForm((prev) => ({
        ...prev,
        fileName: file.name,
        fileType: file.type,
        fileDataUrl: String(reader.result || '')
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleAddContent = () => {
    if (!contentForm.title) {
      toast.error('Title required', 'Add a title before publishing content.')
      return
    }

    const requiredTierId =
      contentForm.requiredTierId === 'public'
        ? -1
        : Number(contentForm.requiredTierId)

    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
      title: contentForm.title,
      type: contentForm.type,
      summary: contentForm.summary,
      body: contentForm.body,
      url: contentForm.url,
      requiredTierId,
      published: contentForm.published,
      createdAt: Date.now(),
      fileName: contentForm.fileName,
      fileType: contentForm.fileType,
      fileDataUrl: contentForm.fileDataUrl
    }

    const next = addCreatorContent(address, item)
    setContentItems(next)
    setContentForm(defaultContentForm)
    toast.success('Content saved', 'Your premium content is now visible on your page.')
  }

  const handleUpdateContent = () => {
    if (!editContent) return
    const updated = {
      ...editContent,
      requiredTierId:
        editContent.requiredTierId === 'public'
          ? -1
          : Number(editContent.requiredTierId)
    }
    const next = updateCreatorContent(address, updated)
    setContentItems(next)
    setEditContent(null)
    toast.success('Content updated', 'Your changes are live.')
  }

  const handleDeleteContent = (id) => {
    const next = deleteCreatorContent(address, id)
    setContentItems(next)
    toast.success('Content deleted', 'The item has been removed.')
  }

  const handleSuggestPricing = () => {
    const suggestion = buildContentPricing(contentItems, contentSignals)
    setContentPricing(suggestion)
  }

  const handleUploadFiles = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const mapped = await Promise.all(
      files.map(async (file) => {
        const category = file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type === 'application/pdf'
              ? 'pdf'
              : 'doc'
        let preview = ''
        if (category === 'image' || category === 'video' || category === 'pdf') {
          preview = await new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result)
            reader.readAsDataURL(file)
          })
        }
        return {
          id: `${Date.now()}-${file.name}`,
          name: file.name,
          category,
          size: file.size,
          preview
        }
      })
    )
    setUploads((prev) => [...mapped, ...prev])
    event.target.value = ''
  }

  const removeUpload = (id) => {
    setUploads((prev) => prev.filter((file) => file.id !== id))
  }

  const handlePricingSuggest = () => {
    const suggestion = buildPricingFromUploads(uploads, subscriptionForm)
    setPricingSuggestion(suggestion)
    toast.success('Pricing suggested', suggestion.insight)
  }

  const handleLaunchSubscription = () => {
    if (!uploads.length) {
      toast.error('Upload content', 'Add at least one premium asset to launch.')
      return
    }
    const price = subscriptionForm.manualPrice || pricingSuggestion?.recommendedPrice
    if (!price) {
      toast.error('Set a price', 'Add a manual price or use AI suggestion first.')
      return
    }
    const payload = {
      uploads,
      niche: subscriptionForm.niche,
      audience: subscriptionForm.audience,
      paidSubs: subscriptionForm.paidSubs,
      links: subscriptionForm.links,
      price,
      suggestion: pricingSuggestion
    }
    saveSubscriptionConfig(address, payload)
    toast.success('Subscription launched', 'Your page is live for subscribers.')
  }

  const handleSaveUsernameOverride = () => {
    const key = initiaAddress || address
    if (!key) return
    const cleaned = usernameOverrideValue.trim()
    if (!cleaned) {
      setUsernameOverride(key, '')
      toast.success('Override cleared', 'We will show the wallet address until Initia resolves.')
      return
    }
    const finalName = cleaned.endsWith('.init') ? cleaned : `${cleaned}.init`
    setUsernameOverride(key, finalName)
    setUsernameOverrideValue(finalName)
    toast.success('Username saved', 'We will display this while Initia resolves.')
  }

  const handleSaveSenderOverride = () => {
    const cleaned = senderOverride.trim()
    if (!cleaned) {
      localStorage.removeItem('creato3.senderOverride')
      toast.success('Sender override cleared', 'We will use the wallet address directly.')
      return
    }
    if (!cleaned.startsWith('init1')) {
      toast.error('Invalid address', 'Paste a bech32 Initia address that starts with init1.')
      return
    }
    localStorage.setItem('creato3.senderOverride', cleaned)
    setSenderOverride(cleaned)
    toast.success('Sender saved', 'This address will be used to sign transactions.')
  }

  const applySuggestion = (tier) => {
    setTierForm({
      name: tier.name,
      price: tier.price,
      description: tier.description
    })
    toast.success('Tier prefilled', 'Edit the details and click Add Tier to publish.')
  }

  if (!address) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold">Connect your wallet</h2>
        <p className="mt-3 text-slate-400">Creators need a connected wallet to continue.</p>
      </div>
    )
  }

  if (!registered) {
    const walletReady = Boolean(address)
    const faucetReady = Number(l1Balance || 0) > 0
    const resolvedUsername = username || usernameOverrideValue
    const usernameReady = Boolean(resolvedUsername)
    const chainIssue = !chainHealth.loading && !chainHealth.ok
      ? summarizeChainHealth(chainHealth)
      : ''
    const createDisabled = !canRegister || !senderLooksValid || chainHealth.loading || !chainHealth.ok

    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-16 pt-24">
        <section className="glass p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold">Creator onboarding</h2>
              <p className="mt-2 text-slate-400">
                A clean 4-step flow that mirrors Initia Link. Your profile is ready in minutes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-secondary"
                onClick={() => window.open('https://app.testnet.initia.xyz/faucet', '_blank')}
                type="button"
              >
                Open Faucet
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.open('https://app.testnet.initia.xyz/usernames', '_blank')}
                type="button"
              >
                Register .init
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              { label: 'Wallet', done: walletReady, hint: 'Connect wallet' },
              {
                label: 'Faucet',
                done: faucetReady,
                hint: `L1 balance: ${formatUinit(l1Balance)} INIT`
              },
              {
                label: '.init',
                done: usernameReady,
                hint: usernameReady ? resolvedUsername : 'Set primary name'
              },
              { label: 'Create', done: false, hint: 'Complete profile' }
            ].map((step, idx) => (
              <div key={step.label} className="glass-soft flex flex-col items-center gap-3 p-4 text-center">
                <div
                  className={
                    step.done
                      ? 'flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200'
                      : 'flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-slate-300'
                  }
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="text-xs text-slate-400">{step.hint}</p>
                </div>
              </div>
            ))}
          </div>
          {!username ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              <p className="font-semibold">Username not showing yet?</p>
              <p className="mt-1 text-slate-400">
                Initia can take a minute to resolve primary names. Paste your .init and we will show it immediately.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="input flex-1"
                  placeholder="gayatri.init"
                  value={usernameOverrideValue}
                  onChange={(event) => setUsernameOverrideValue(event.target.value)}
                />
                <button className="btn-secondary" onClick={handleSaveUsernameOverride} type="button">
                  Save
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold">Transactions still failing?</p>
            <p className="mt-1 text-slate-400">
              If your wallet is connected but the app says “empty address”, paste your Initia address (init1...) here.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                className="input flex-1"
                placeholder="init1..."
                value={senderOverride}
                onChange={(event) => setSenderOverride(event.target.value)}
              />
              <button className="btn-secondary" onClick={handleSaveSenderOverride} type="button">
                Save
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            <p className="font-semibold">Appchain connectivity</p>
            {chainHealth.loading ? (
              <p className="mt-1 text-slate-400">
                Checking local EVM and Initia endpoints...
              </p>
            ) : chainHealth.ok ? (
              <p className="mt-1 text-emerald-300">
                Appchain is reachable. Registration should be able to submit transactions.
              </p>
            ) : (
              <p className="mt-1 text-amber-200">{chainIssue}</p>
            )}
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {[
                { label: 'EVM RPC', url: EVM_RPC },
                { label: 'Cosmos RPC', url: COSMOS_RPC },
                { label: 'REST API', url: REST_API }
              ].map((endpoint) => {
                const status = chainHealth.results.find((result) => result.label === endpoint.label)
                const reachable = status?.ok

                return (
                  <div key={endpoint.label} className="rounded-2xl border border-white/10 bg-black/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {endpoint.label}
                    </p>
                    <p className="mt-2 break-all text-xs text-slate-300">{endpoint.url}</p>
                    <p className={reachable ? 'mt-2 text-xs text-emerald-300' : 'mt-2 text-xs text-amber-200'}>
                      {chainHealth.loading
                        ? 'Checking...'
                        : reachable
                          ? 'Reachable'
                          : status?.error || 'Unreachable'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="glass p-8">
            <h3 className="text-2xl font-semibold">Create your creator profile</h3>
            <p className="mt-2 text-sm text-slate-400">
              Tell fans who you are. Add your .init name if you have one. We’ll show it instead of a wallet.
            </p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
              <p className="font-semibold">Wallet status</p>
              <p className="mt-1 text-slate-400">
                Wallet Initia (init1…): {connectedInitiaAddress || 'not resolved'}
              </p>
              <p className="mt-1 text-slate-400">
                Tx sender (init1…): {senderAddress || 'not connected'}
              </p>
              <p className="mt-1 text-slate-400">
                EVM (0x…): {evmAddress || 'not connected'}
              </p>
              {!senderLooksValid && senderAddress ? (
                <p className="mt-2 text-xs text-danger">
                  Sender must start with init1…
                </p>
              ) : null}
            </div>
            {l2Balance === 0n ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                You need a small L2 balance to register. Bridge from L1 to creato3‑1 first.
                <div className="mt-3">
                  <BridgeButton requiredAmount="0.01" />
                </div>
              </div>
            ) : null}
            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="label">Display name</span>
                  <input
                    className="input"
                    value={registerForm.displayName}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, displayName: event.target.value })
                    }
                    placeholder="Priya Studio"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Category</span>
                  <select
                    className="input"
                    value={registerForm.category}
                    onChange={(event) =>
                      setRegisterForm({ ...registerForm, category: event.target.value })
                    }
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2">
                <span className="label">.init username (optional)</span>
                <input
                  className="input"
                  value={registerForm.initUsername}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, initUsername: event.target.value })
                  }
                  placeholder="priya.init"
                />
                <span className="text-xs text-slate-400">
                  Register at app.testnet.initia.xyz/usernames and set as primary.
                </span>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Primary channel link</span>
                <input
                  className="input"
                  value={registerForm.channelLink}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, channelLink: event.target.value })
                  }
                  placeholder="https://youtube.com/@yourchannel"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Creator bio</span>
                <textarea
                  className="input"
                  value={registerForm.bio}
                  maxLength={280}
                  onChange={(event) =>
                    setRegisterForm({ ...registerForm, bio: event.target.value })
                  }
                  rows={4}
                  placeholder="Share what fans get when they subscribe."
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="btn-primary"
                onClick={handleRegister}
                disabled={createDisabled}
                type="button"
              >
                {status === 'registering'
                  ? 'Creating...'
                  : chainHealth.loading
                    ? 'Checking appchain...'
                    : chainHealth.ok
                      ? 'Create Profile'
                      : 'Start appchain to continue'}
              </button>
              <button className="btn-secondary" onClick={() => setShowAI(!showAI)}>
                {showAI ? 'Hide AI Pricing' : 'AI Pricing Assistant'}
              </button>
            </div>
            {!chainHealth.loading && !chainHealth.ok ? (
              <p className="mt-3 text-sm text-amber-200">
                Registration is disabled until the app can reach your configured rollup endpoints.
              </p>
            ) : null}
          </section>

          <section className="glass p-8">
            <h3 className="text-2xl font-semibold">Pricing signals</h3>
            <p className="mt-2 text-sm text-slate-400">
              Tell us about your existing channel + subscribers. This powers smarter pricing suggestions.
            </p>
            <div className="mt-6 grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="label">Primary channel</span>
                <select
                  className="input"
                  value={contentSignals.channel}
                  onChange={(event) =>
                    setContentSignals({ ...contentSignals, channel: event.target.value })
                  }
                >
                  {CHANNEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Audience size</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={contentSignals.audience}
                  onChange={(event) =>
                    setContentSignals({
                      ...contentSignals,
                      audience: Number(event.target.value || 0)
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Existing paid subscribers</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={contentSignals.paidSubs}
                  onChange={(event) =>
                    setContentSignals({
                      ...contentSignals,
                      paidSubs: Number(event.target.value || 0)
                    })
                  }
                />
              </label>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              You can fine tune pricing after you publish content. Creato3 keeps 100% of earnings.
            </div>
            {showAI ? <AIPricingAdvisor embedded /> : null}
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 pb-16 pt-24 lg:flex-row">
      <aside className="glass h-fit w-full max-w-xs p-6">
        <h3 className="text-xl font-semibold">Dashboard</h3>
        <p className="mt-2 text-sm text-slate-400">{creator?.displayName || short(address)}</p>
        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-400">
          <span>Overview</span>
          <span>Tiers</span>
          <span>Content</span>
          <span>Subscribers</span>
          <span>AI Tools</span>
          <span>Earnings</span>
        </div>
      </aside>

      <div className="flex-1 space-y-8">
        <section className="glass p-8">
          <h2 className="text-3xl font-semibold">Welcome back {creator?.displayName || short(address)}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="stat">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total earned</p>
              {loadingStats ? (
                <Skeleton className="mt-3 h-6 w-24" />
              ) : (
                <p className="mt-2 text-2xl font-semibold">
                  <AnimatedNumber value={balances.earned} suffix=" INIT" />
                </p>
              )}
            </div>
            <div className="stat">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Withdrawable</p>
              {loadingStats ? (
                <Skeleton className="mt-3 h-6 w-24" />
              ) : (
                <p className="mt-2 text-2xl font-semibold">
                  <AnimatedNumber value={balances.withdrawable} suffix=" INIT" />
                </p>
              )}
            </div>
            <div className="stat">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active subs</p>
              {loadingStats ? (
                <Skeleton className="mt-3 h-6 w-16" />
              ) : (
                <p className="mt-2 text-2xl font-semibold">
                  <AnimatedNumber value={stats.active} decimals={0} />
                </p>
              )}
            </div>
            <div className="stat">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">This month</p>
              {loadingStats ? (
                <Skeleton className="mt-3 h-6 w-16" />
              ) : (
                <p className="mt-2 text-2xl font-semibold">
                  <AnimatedNumber value={stats.month} decimals={0} />
                </p>
              )}
            </div>
          </div>
          <button className="btn-primary mt-6" onClick={handleWithdraw}>
            Withdraw earnings (100% yours)
          </button>
        </section>

        <section className="glass p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-semibold">Launch subscription</h3>
              <p className="text-sm text-slate-400">
                Upload premium content, add audience signals, and let AI recommend pricing.
              </p>
            </div>
            <button className="btn-secondary" onClick={handlePricingSuggest} type="button">
              Get AI Pricing Suggestion
            </button>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">1. Upload premium content</p>
                <p className="mt-1 text-xs text-slate-400">
                  Images, videos, PDFs, and docs. Fans will see previews on your page.
                </p>
                <input
                  className="mt-3 w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  type="file"
                  multiple
                  onChange={handleUploadFiles}
                />
                {uploads.length ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {uploads.map((file) => (
                      <div key={file.id} className="glass-soft flex items-center gap-3 p-3">
                        <div className="h-10 w-10 rounded-xl bg-white/10 text-xs flex items-center justify-center">
                          {file.category.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{file.name}</p>
                          <p className="text-xs text-slate-400">{Math.round(file.size / 1024)} KB</p>
                        </div>
                        <button className="btn-ghost" onClick={() => removeUpload(file.id)} type="button">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2">
                  <span className="label">Niche / topic</span>
                  <input
                    className="input"
                    value={subscriptionForm.niche}
                    onChange={(event) =>
                      setSubscriptionForm({ ...subscriptionForm, niche: event.target.value })
                    }
                    placeholder="Crypto signals, coding tutorials…"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Expected subscribers</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={subscriptionForm.audience}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        audience: Number(event.target.value || 0)
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="label">Existing paid subscribers</span>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    value={subscriptionForm.paidSubs}
                    onChange={(event) =>
                      setSubscriptionForm({
                        ...subscriptionForm,
                        paidSubs: Number(event.target.value || 0)
                      })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">2. Links</p>
                <div className="mt-3 grid gap-3">
                  {linkOptions.map((item) => (
                    <input
                      key={item.key}
                      className="input"
                      placeholder={`${item.label} link`}
                      value={subscriptionForm.links[item.key]}
                      onChange={(event) =>
                        setSubscriptionForm({
                          ...subscriptionForm,
                          links: { ...subscriptionForm.links, [item.key]: event.target.value }
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm font-semibold">3. Pricing</p>
                {pricingSuggestion ? (
                  <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">
                    Suggested price: ₹{pricingSuggestion.recommendedPrice}
                    <br />
                    Market range: {pricingSuggestion.range}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    Click “Get AI Pricing Suggestion” for a smart range.
                  </p>
                )}
                <input
                  className="input mt-3"
                  placeholder="Set your price ₹"
                  value={subscriptionForm.manualPrice}
                  onChange={(event) =>
                    setSubscriptionForm({ ...subscriptionForm, manualPrice: event.target.value })
                  }
                />
                <button className="glow-btn mt-4 w-full" onClick={handleLaunchSubscription} type="button">
                  Launch Subscription
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Payments are crypto-only for now. Stripe/UPI will be added later.
                </p>
              </div>
            </div>
          </div>
        </section>
        <Modal
          open={Boolean(editTier)}
          onClose={() => setEditTier(null)}
          title={editTier ? `Edit tier #${editTier.tierId}` : 'Edit tier'}
        >
          {editTier ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label">Tier name</span>
                <input
                  className="input"
                  value={editTier.name}
                  onChange={(event) =>
                    setEditTier({ ...editTier, name: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Price (INIT)</span>
                <input
                  className="input"
                  value={editTier.price}
                  onChange={(event) =>
                    setEditTier({ ...editTier, price: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Description</span>
                <textarea
                  className="input"
                  value={editTier.description}
                  onChange={(event) =>
                    setEditTier({ ...editTier, description: event.target.value })
                  }
                  rows={3}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Active</span>
                <select
                  className="input"
                  value={editTier.active ? 'yes' : 'no'}
                  onChange={(event) =>
                    setEditTier({ ...editTier, active: event.target.value === 'yes' })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setEditTier(null)} type="button">
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpdateTier} type="button">
                  Save Changes
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        <Modal
          open={Boolean(editContent)}
          onClose={() => setEditContent(null)}
          title={editContent ? 'Edit content' : 'Edit content'}
        >
          {editContent ? (
            <div className="grid gap-4">
              <label className="flex flex-col gap-2">
                <span className="label">Title</span>
                <input
                  className="input"
                  value={editContent.title}
                  onChange={(event) =>
                    setEditContent({ ...editContent, title: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Summary</span>
                <textarea
                  className="input"
                  value={editContent.summary}
                  onChange={(event) =>
                    setEditContent({ ...editContent, summary: event.target.value })
                  }
                  rows={3}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="label">Required tier</span>
                <select
                  className="input"
                  value={editContent.requiredTierId}
                  onChange={(event) =>
                    setEditContent({ ...editContent, requiredTierId: event.target.value })
                  }
                >
                  <option value="public">Public (no paywall)</option>
                  {tierOptions.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-3">
                <button className="btn-ghost" onClick={() => setEditContent(null)} type="button">
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleUpdateContent} type="button">
                  Save Content
                </button>
              </div>
            </div>
          ) : null}
        </Modal>

        <section className="glass p-8">
          <h3 className="text-2xl font-semibold">Subscribers</h3>
          {subscribers.length === 0 ? (
            <p className="mt-3 text-slate-400">No subscribers yet.</p>
          ) : (
            <div className="mt-4 grid gap-3">
              {subscribers.map((sub) => (
                <div key={`${sub.subscriber}-${sub.expiry}`} className="glass-soft flex flex-wrap items-center justify-between gap-2 p-4 text-sm text-slate-300">
                  <span>{short(sub.subscriber)}</span>
                  <span>Tier {sub.tierId}</span>
                  <span>Renews: {new Date(sub.expiry).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
