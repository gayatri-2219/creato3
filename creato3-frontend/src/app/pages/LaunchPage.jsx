import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ethers } from 'ethers'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import { getSmartPricing } from '../../api/creatorAI'
import { useToast } from '../../shared/toast'
import { CHAIN_ID, CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { executeWithAccountBootstrap } from '../../utils/accountBootstrap'
import { buildMsgCall } from '../../utils/msgCall'
import { getSubscriptionConfig, saveSubscriptionConfig } from '../../utils/subscriptionStore'
import { extractTxHash, getTxExplorerUrl } from '../../utils/txProof'
import {
  DollarSignIcon,
  GlobeIcon,
  LinkIcon,
  MessageCircleIcon,
  SparklesIcon,
  UploadIcon,
  XIcon
} from '../components/icons'

const fileToUpload = async (file) => {
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
      reader.onload = () => resolve(String(reader.result || ''))
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
}

export function LaunchPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { address, hexAddress, initiaAddress, openConnect, requestTxSync } = useInterwovenKit()
  const resolvedInitiaAddress = (useInitiaAddress() || initiaAddress || '').trim()
  const evmAddress = hexAddress || address || ''

  const [registered, setRegistered] = useState(false)
  const [creator, setCreator] = useState(null)
  const [tierIds, setTierIds] = useState([])
  const [tiers, setTiers] = useState([])
  const [files, setFiles] = useState([])
  const [expectedSubs, setExpectedSubs] = useState('')
  const [telegram, setTelegram] = useState('')
  const [discord, setDiscord] = useState('')
  const [website, setWebsite] = useState('')
  const [manualPrice, setManualPrice] = useState('')
  const [pitch, setPitch] = useState('')
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [pricingBusy, setPricingBusy] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchTxHash, setLaunchTxHash] = useState('')

  useEffect(() => {
    if (!evmAddress || !CONTRACTS.profile) return
    let active = true

    const loadCreator = async () => {
      try {
        const isRegistered = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'isRegistered',
          args: [evmAddress]
        })

        if (!active) return

        setRegistered(Boolean(isRegistered))

        if (!isRegistered) return

        const creatorData = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'getCreator',
          args: [evmAddress]
        })

        const [tierList, ids] = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'getActiveTiers',
          args: [evmAddress]
        })

        if (!active) return

        setCreator(creatorData)
        setTiers(tierList || [])
        setTierIds(ids || [])

        const stored = getSubscriptionConfig(evmAddress)
        if (stored) {
          setFiles(stored.uploads || [])
          setExpectedSubs(String(stored.audience || ''))
          setTelegram(stored.links?.telegram || '')
          setDiscord(stored.links?.discord || '')
          setWebsite(stored.links?.website || '')
          setManualPrice(String(stored.price || ''))
          setPitch(String(stored.pitch || ''))
          setAiSuggestion(stored.suggestion || null)
          setShowAiSuggestion(Boolean(stored.suggestion))
        } else if (tierList?.length) {
          setManualPrice(ethers.formatEther(tierList[0].price))
        }
      } catch {
        if (active) {
          setRegistered(false)
        }
      }
    }

    loadCreator()

    return () => {
      active = false
    }
  }, [evmAddress])

  const handleFileUpload = async (event) => {
    const inputFiles = Array.from(event.target.files || [])
    if (!inputFiles.length) return

    const mapped = await Promise.all(inputFiles.map(fileToUpload))
    setFiles((prev) => [...prev, ...mapped])
    event.target.value = ''
  }

  const handleRemoveFile = (id) => {
    setFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const buildContentSummary = () => {
    const parts = []
    if (creator?.displayName) {
      parts.push(`On-chain display name: ${creator.displayName}`)
    }
    if (creator?.bio) {
      parts.push(`Bio: ${creator.bio}`)
    }
    if (creator?.category) {
      parts.push(`Category: ${creator.category}`)
    }
    if (files.length) {
      const fileLine = files
        .map((f) => `${f.name} (${f.category}, ${(f.size / 1024 / 1024).toFixed(2)} MB)`)
        .join('; ')
      parts.push(`Premium uploads (${files.length}): ${fileLine}`)
    }
    if (pitch.trim()) {
      parts.push(`Creator pitch / what subscribers get: ${pitch.trim()}`)
    }
    return parts.join('\n') || 'No uploads or pitch yet — using profile + audience only.'
  }

  const sourceLabel = (src) => {
    if (src === 'groq') return 'Groq (server)'
    if (src === 'mock') return 'Demo rules (add GROQ_API_KEY on server for LLM)'
    if (src === 'local') return 'Built-in heuristic (set VITE_BACKEND_URL for API + Groq)'
    if (src === 'cloud') return 'Claude / LM Studio'
    return src || 'AI'
  }

  const handleGetAiPricing = async () => {
    if (!expectedSubs) {
      toast.error('Audience required', 'Add your expected subscribers before asking for AI pricing.')
      return
    }

    setPricingBusy(true)

    try {
      const data = await getSmartPricing({
        niche: creator?.category || 'creator',
        subscribers: Number(expectedSubs),
        platform: 'Creato3',
        contentSummary: buildContentSummary(),
        displayName: creator?.displayName || '',
        bio: creator?.bio || ''
      })

      const options = data?.tiers || []
      const init = (t) => {
        const v = Number(t?.priceInit ?? t?.price ?? 0)
        return Number.isFinite(v) ? v : 0
      }
      const low = options[0] ? init(options[0]) : 2
      const middle = options[1] ? init(options[1]) : options[0] ? init(options[0]) : low
      const high = options[2] ? init(options[2]) : middle
      const confidenceBase = Number(data?.expected_conversion_pct || 3.5)

      const fmt = (n) => (Number.isFinite(n) ? String(n) : '0')

      const suggestion = {
        price: fmt(middle),
        range: `${fmt(low)} – ${fmt(high)} INIT`,
        confidence: `${Math.min(99, 72 + Math.round(confidenceBase * 3))}%`,
        reasoning: data?.reasoning || '',
        tiers: options,
        sourceLabel: sourceLabel(data?.source),
        comparisonNote: data?.comparison?.creato3_value_note || ''
      }

      setAiSuggestion(suggestion)
      setShowAiSuggestion(true)

      if (!manualPrice) {
        setManualPrice(fmt(middle))
      }
    } catch (error) {
      toast.error('AI pricing failed', error?.message || 'Please try again.')
    } finally {
      setPricingBusy(false)
    }
  }

  const handleLaunch = async () => {
    if (!resolvedInitiaAddress) {
      openConnect?.()
      toast.error('Connect wallet', 'Connect your Initia wallet before launching.')
      return
    }

    if (!registered) {
      toast.error('Create profile first', 'Your creator profile must exist before launch.')
      navigate('/create-profile')
      return
    }

    if (!files.length) {
      toast.error('Content required', 'Upload at least one premium file to launch.')
      return
    }

    const finalPrice = (manualPrice || aiSuggestion?.price || '').trim()

    if (!finalPrice) {
      toast.error('Price required', 'Set your subscription price before launching.')
      return
    }

    setLaunching(true)

    try {
      const launchConfig = {
        uploads: files,
        niche: creator?.category || '',
        audience: Number(expectedSubs || 0),
        paidSubs: 0,
        links: {
          telegram,
          discord,
          website
        },
        pitch: pitch.trim(),
        price: finalPrice,
        suggestion: aiSuggestion
      }

      saveSubscriptionConfig(evmAddress, launchConfig)

      const priceWei = ethers.parseEther(String(finalPrice))
      const iface = new ethers.Interface(CREATOR_PROFILE_ABI)

      if (tierIds.length > 0) {
        const tier = tiers[0]
        const data = iface.encodeFunctionData('updateTier', [
          tierIds[0],
          priceWei,
          tier?.name || 'Premium',
          tier?.description || creator?.bio || 'Full access to premium content.',
          true
        ])

        const msg = buildMsgCall({
          sender: resolvedInitiaAddress,
          contractAddr: CONTRACTS.profile,
          input: data
        })

        const result = await executeWithAccountBootstrap({
          actionLabel: 'launch your subscription',
          initiaAddress: resolvedInitiaAddress,
          toast,
          execute: () => requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
        })
        setLaunchTxHash(extractTxHash(result))
      } else {
        const data = iface.encodeFunctionData('createTier', [
          priceWei,
          'Premium',
          creator?.bio || 'Full access to premium content.'
        ])

        const msg = buildMsgCall({
          sender: resolvedInitiaAddress,
          contractAddr: CONTRACTS.profile,
          input: data
        })

        const result = await executeWithAccountBootstrap({
          actionLabel: 'launch your subscription',
          initiaAddress: resolvedInitiaAddress,
          toast,
          execute: () => requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
        })
        setLaunchTxHash(extractTxHash(result))
      }

      toast.success('Subscription launched', 'Your creator page is now ready for subscribers.')
    } catch (error) {
      toast.error('Launch failed', error?.message || 'Please try again.')
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl dark:text-white">Launch Your Subscription</h1>
          <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
            Set up your monetization in minutes
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-[#6b7280] dark:text-[#9ca3af]">
                Demo flow
              </p>
              <h2 className="dark:text-white">Show judges exactly what is verifiable</h2>
              <p className="mt-2 max-w-2xl text-sm text-[#6b7280] dark:text-[#9ca3af]">
                1. Create profile on-chain. 2. Run AI pricing. 3. Launch a paid tier. 4. Open the
                creator page. 5. Subscribe from a second wallet and show the transaction hash.
              </p>
            </div>
            <button
              onClick={() => navigate('/architecture')}
              className="rounded-full border border-[rgba(0,0,0,0.08)] px-5 py-3 text-sm transition-colors hover:bg-[#f3f4f6] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#1a1a2e]"
              type="button"
            >
              Open architecture story
            </button>
          </div>
        </div>

        {!registered ? (
          <div className="mb-8 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 text-center shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <h2 className="mb-3 dark:text-white">Create your profile first</h2>
            <p className="text-[#6b7280] dark:text-[#9ca3af]">
              We need your on-chain profile first.
            </p>
            <button
              onClick={() => navigate('/create-profile')}
              className="mt-6 rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
              type="button"
            >
              Complete Profile
            </button>
          </div>
        ) : null}

        <div className="space-y-8">
          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a7f3d0]/20 to-[#93c5fd]/20">
                <UploadIcon className="h-6 w-6 text-[#6ee7b7]" />
              </div>
              <h2 className="dark:text-white">Content Upload</h2>
            </div>

            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-[rgba(0,0,0,0.1)] p-12 text-center transition-all hover:border-[#93c5fd] hover:bg-[#f9fafb] dark:border-[rgba(255,255,255,0.12)] dark:hover:bg-[#1a1a2e]">
              <input className="hidden" multiple type="file" onChange={handleFileUpload} />
              <UploadIcon className="mx-auto mb-4 h-12 w-12 text-[#6b7280] dark:text-[#9ca3af]" />
              <p className="mb-2 dark:text-white">Drag and drop files or click to browse</p>
              <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Supports images, videos, PDFs, and documents
              </p>
            </label>

            {files.length > 0 ? (
              <div className="mt-4 space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#1a1a2e]"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#93c5fd]/20 to-[#bfdbfe]/20 text-lg">
                      {file.category === 'image' ? '🖼️' : file.category === 'video' ? '🎬' : '📄'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate dark:text-white">{file.name}</p>
                      <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {file.category.toUpperCase()} · {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <button
                      aria-label={`Remove ${file.name}`}
                      className="rounded-full border border-[rgba(0,0,0,0.08)] p-2 text-[#6b7280] transition-colors hover:border-[#f87171] hover:bg-[#fee2e2] hover:text-[#dc2626] dark:border-[rgba(255,255,255,0.1)] dark:text-[#9ca3af] dark:hover:border-[#f87171]/60 dark:hover:bg-[#3b1f28] dark:hover:text-[#fca5a5]"
                      onClick={() => handleRemoveFile(file.id)}
                      type="button"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ddd6fe]/20 to-[#fbcfe8]/20">
                <DollarSignIcon className="h-6 w-6 text-[#ddd6fe]" />
              </div>
              <h2 className="dark:text-white">Audience Size</h2>
            </div>

            <div>
              <label className="mb-2 block dark:text-white">Expected Subscribers</label>
              <input
                type="number"
                value={expectedSubs}
                onChange={(event) => setExpectedSubs(event.target.value)}
                placeholder="e.g., 100"
                className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#93c5fd]/20 to-[#bfdbfe]/20">
                <LinkIcon className="h-6 w-6 text-[#93c5fd]" />
              </div>
              <h2 className="dark:text-white">Community Links</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 flex items-center gap-2 dark:text-white">
                  <MessageCircleIcon className="h-4 w-4" />
                  Telegram
                </label>
                <input
                  type="text"
                  value={telegram}
                  onChange={(event) => setTelegram(event.target.value)}
                  placeholder="t.me/yourchannel"
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 dark:text-white">
                  <MessageCircleIcon className="h-4 w-4" />
                  Discord
                </label>
                <input
                  type="text"
                  value={discord}
                  onChange={(event) => setDiscord(event.target.value)}
                  placeholder="discord.gg/yourserver"
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 dark:text-white">
                  <GlobeIcon className="h-4 w-4" />
                  Website
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  placeholder="yourwebsite.com"
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>
            </div>
          </div>

          <div
            id="ai-pricing"
            className="scroll-mt-24 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]"
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fbcfe8]/20 to-[#ddd6fe]/20">
                <SparklesIcon className="h-6 w-6 text-[#ddd6fe]" />
              </div>
              <div>
                <h2 className="dark:text-white">AI pricing agent</h2>
                <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Analyzes your profile, uploads, and pitch; suggests INIT/month (chain currency).
                </p>
              </div>
            </div>

            <p className="mb-4 text-[#6b7280] dark:text-[#9ca3af]">
              Uses your <strong className="text-[#374151] dark:text-[#e5e7eb]">Creato3 API</strong> when{' '}
              <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
                VITE_BACKEND_URL
              </code>{' '}
              is set (Groq on the server). Otherwise uses a smart local heuristic — not random USD
              mislabeled as INIT.
            </p>

            <div className="mb-6">
              <label className="mb-2 block dark:text-white">
                What subscribers get (optional — improves analysis)
              </label>
              <textarea
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                placeholder="e.g. Weekly 4K tutorials, source files, monthly live Q&A, private Discord…"
                rows={3}
                className="w-full resize-y rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
              />
            </div>

            <button
              onClick={handleGetAiPricing}
              disabled={!expectedSubs || pricingBusy}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ddd6fe] to-[#fbcfe8] px-6 py-3 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              type="button"
            >
              <SparklesIcon className="h-5 w-5" />
              {pricingBusy ? 'Analyzing…' : 'Run AI pricing'}
            </button>

            <AnimatePresence>
              {showAiSuggestion && aiSuggestion ? (
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 space-y-4 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-6 dark:border-[rgba(255,255,255,0.1)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-[#6ee7b7]" />
                      <h3 className="dark:text-white">Recommendation</h3>
                    </div>
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-[#4b5563] dark:bg-white/10 dark:text-[#d1d5db]">
                      {aiSuggestion.sourceLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        Suggested (mid tier)
                      </p>
                      <p className="text-2xl dark:text-white">{aiSuggestion.price} INIT</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">per month on-chain</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">INIT range</p>
                      <p className="text-xl dark:text-white">{aiSuggestion.range}</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">low → high tier</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">Confidence</p>
                      <p className="text-2xl text-[#6ee7b7]">{aiSuggestion.confidence}</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">model estimate</p>
                    </div>
                  </div>

                  {aiSuggestion.reasoning ? (
                    <div className="rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/60 p-4 text-sm leading-relaxed text-[#374151] dark:border-[rgba(255,255,255,0.08)] dark:bg-[#1a1a2e]/80 dark:text-[#d1d5db]">
                      <p className="mb-1 font-semibold text-[#111827] dark:text-white">Why these numbers</p>
                      <p>{aiSuggestion.reasoning}</p>
                    </div>
                  ) : null}

                  {aiSuggestion.comparisonNote ? (
                    <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">
                      {aiSuggestion.comparisonNote}
                    </p>
                  ) : null}

                  {Array.isArray(aiSuggestion.tiers) && aiSuggestion.tiers.length > 0 ? (
                    <div>
                      <p className="mb-2 text-sm font-medium text-[#374151] dark:text-[#e5e7eb]">
                        Tier breakdown (INIT / month)
                      </p>
                      <ul className="space-y-2">
                        {aiSuggestion.tiers.map((t, i) => (
                          <li
                            key={`${t.name}-${i}`}
                            className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-white/50 px-3 py-2 text-sm dark:bg-[#1a1a2e]/60"
                          >
                            <span className="font-medium dark:text-white">{t.name}</span>
                            <span className="text-[#059669] dark:text-[#6ee7b7]">
                              {Number(t.priceInit ?? t.price ?? 0)} INIT
                            </span>
                            {t.description ? (
                              <span className="w-full text-xs text-[#6b7280] dark:text-[#9ca3af]">
                                {t.description}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6ee7b7]/20 to-[#a7f3d0]/20">
                <DollarSignIcon className="h-6 w-6 text-[#6ee7b7]" />
              </div>
              <h2 className="dark:text-white">Set Your Price</h2>
            </div>

            <div>
              <label className="mb-2 block dark:text-white">Monthly Subscription Price</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[#6b7280] dark:text-[#9ca3af]">
                  INIT
                </span>
                <input
                  type="number"
                  value={manualPrice}
                  onChange={(event) => setManualPrice(event.target.value)}
                  placeholder="15.00"
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] py-4 pl-20 pr-6 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>
              <p className="mt-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                You keep 100% of your earnings. No platform fees.
              </p>
            </div>
          </div>

          <button
            className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-5 text-lg shadow-2xl transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            onClick={handleLaunch}
            disabled={launching || !registered}
            type="button"
          >
            {launching ? 'Launching...' : 'Launch Subscription'}
          </button>

          {launchTxHash ? (
            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <h3 className="mb-2 dark:text-white">Launch verified on-chain</h3>
              <p className="mb-3 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Keep this transaction hash in your demo or README so anyone can verify that the tier
                was created or updated on Initia.
              </p>
              <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[#f9fafb] px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                {launchTxHash}
              </code>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(launchTxHash)}
                  className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm transition-colors hover:bg-[#eef2ff] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#312e81]"
                  type="button"
                >
                  Copy hash
                </button>
                {getTxExplorerUrl(launchTxHash) ? (
                  <a
                    href={getTxExplorerUrl(launchTxHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm transition-colors hover:bg-[#ecfeff] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#164e63]"
                  >
                    Verify on Initia
                  </a>
                ) : null}
                <button
                  onClick={() => navigate(`/creator/${evmAddress}`)}
                  className="rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-4 py-2 text-sm shadow-md transition-transform hover:scale-105 active:scale-95"
                  type="button"
                >
                  Open creator page
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
