import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import { ethers } from 'ethers'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../../abis/CreatorProfile.json'
import { getSmartPricing } from '../../api/creatorAI'
import { useToast } from '../../components/ToastProvider'
import { CHAIN_ID, CONTRACTS } from '../../config/contracts'
import { publicClient } from '../../config/evmClient'
import { executeWithAccountBootstrap } from '../../utils/accountBootstrap'
import { buildMsgCall } from '../../utils/msgCall'
import { getSubscriptionConfig, saveSubscriptionConfig } from '../../utils/subscriptionStore'
import {
  DollarSignIcon,
  GlobeIcon,
  LinkIcon,
  MessageCircleIcon,
  SparklesIcon,
  UploadIcon
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
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [pricingBusy, setPricingBusy] = useState(false)
  const [launching, setLaunching] = useState(false)

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
        platform: 'Creato3'
      })

      const options = data?.tiers || []
      const low = options[0]?.price_usd || 5
      const middle = options[1]?.price_usd || low
      const high = options[2]?.price_usd || middle
      const confidenceBase = Number(data?.expected_conversion_pct || 3.5)

      const suggestion = {
        price: String(middle),
        range: `${low} - ${high} INIT`,
        confidence: `${Math.min(99, 80 + Math.round(confidenceBase * 4))}%`
      }

      setAiSuggestion(suggestion)
      setShowAiSuggestion(true)

      if (!manualPrice) {
        setManualPrice(String(middle))
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

        await executeWithAccountBootstrap({
          initiaAddress: resolvedInitiaAddress,
          toast,
          execute: () => requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
        })
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

        await executeWithAccountBootstrap({
          initiaAddress: resolvedInitiaAddress,
          toast,
          execute: () => requestTxSync({ chainId: CHAIN_ID, messages: [msg] })
        })
      }

      toast.success('Subscription launched', 'Your creator page is now ready for subscribers.')
      navigate(`/creator/${evmAddress}`)
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
                    <span className="flex-1 dark:text-white">{file.name}</span>
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

          <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fbcfe8]/20 to-[#ddd6fe]/20">
                <SparklesIcon className="h-6 w-6 text-[#ddd6fe]" />
              </div>
              <h2 className="dark:text-white">AI Pricing Suggestion</h2>
            </div>

            <p className="mb-6 text-[#6b7280] dark:text-[#9ca3af]">
              Get intelligent pricing recommendations based on your content and market data
            </p>

            <button
              onClick={handleGetAiPricing}
              disabled={!expectedSubs || pricingBusy}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ddd6fe] to-[#fbcfe8] px-6 py-3 shadow-md transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              type="button"
            >
              <SparklesIcon className="h-5 w-5" />
              {pricingBusy ? 'Thinking...' : 'Get AI Pricing Suggestion'}
            </button>

            <AnimatePresence>
              {showAiSuggestion && aiSuggestion ? (
                <Motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 rounded-2xl border border-[rgba(0,0,0,0.08)] bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-6 dark:border-[rgba(255,255,255,0.1)]"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <SparklesIcon className="h-5 w-5 text-[#6ee7b7]" />
                    <h3 className="dark:text-white">AI Recommendation</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        Suggested Price
                      </p>
                      <p className="text-2xl dark:text-white">{aiSuggestion.price} INIT</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">per month</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        Market Range
                      </p>
                      <p className="text-2xl dark:text-white">{aiSuggestion.range}</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">similar creators</p>
                    </div>
                    <div>
                      <p className="mb-1 text-sm text-[#6b7280] dark:text-[#9ca3af]">Confidence</p>
                      <p className="text-2xl text-[#6ee7b7]">{aiSuggestion.confidence}</p>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">accuracy</p>
                    </div>
                  </div>
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
        </div>
      </div>
    </div>
  )
}
