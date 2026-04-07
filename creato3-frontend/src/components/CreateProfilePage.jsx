import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ethers } from 'ethers'
import { useInterwovenKit, useInitiaAddress } from '@initia/interwovenkit-react'
import CREATOR_PROFILE_ABI from '../abis/CreatorProfile.json'
import { CONTRACTS, CHAIN_ID } from '../config/contracts'
import { publicClient } from '../config/evmClient'
import { useToast } from './ToastProvider'
import { buildMsgCall } from '../utils/msgCall'
import { getUsernameOverride, setUsernameOverride } from '../utils/usernameStore'

const CATEGORIES = ['art', 'music', 'coding', 'writing', 'gaming', 'other']

const steps = [
  { id: 'wallet', label: 'Connect Wallet', icon: '1' },
  { id: 'username', label: 'Choose Username', icon: '2' },
  { id: 'profile', label: 'Profile Details', icon: '3' }
]

const normalizeInitName = (value) => {
  const next = (value || '').trim()
  if (!next) return ''
  return next.endsWith('.init') ? next : `${next}.init`
}

export function CreateProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const {
    address,
    hexAddress,
    initiaAddress,
    username,
    openConnect,
    requestTxSync
  } = useInterwovenKit()
  const resolvedInitiaAddress = (useInitiaAddress() || initiaAddress || '').trim()
  const evmAddress = hexAddress || address || ''
  const storedUsername = getUsernameOverride(resolvedInitiaAddress || address)
  const resolvedUsername = username || storedUsername

  const [currentStep, setCurrentStep] = useState('wallet')
  const [registered, setRegistered] = useState(false)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    bio: '',
    category: '',
    initUsername: ''
  })

  useEffect(() => {
    if (!resolvedUsername) return
    setForm((prev) =>
      prev.initUsername
        ? prev
        : {
            ...prev,
            initUsername: resolvedUsername
          }
    )
  }, [resolvedUsername])

  useEffect(() => {
    if (address && currentStep === 'wallet') {
      const timer = window.setTimeout(() => setCurrentStep('username'), 300)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [address, currentStep])

  useEffect(() => {
    if (!evmAddress || !CONTRACTS.profile) return
    let active = true

    const loadRegistration = async () => {
      try {
        setChecking(true)
        const isRegistered = await publicClient.readContract({
          address: CONTRACTS.profile,
          abi: CREATOR_PROFILE_ABI,
          functionName: 'isRegistered',
          args: [evmAddress]
        })

        if (!active) return

        setRegistered(Boolean(isRegistered))

        if (isRegistered) {
          const creator = await publicClient.readContract({
            address: CONTRACTS.profile,
            abi: CREATOR_PROFILE_ABI,
            functionName: 'getCreator',
            args: [evmAddress]
          })

          if (!active) return

          setForm({
            displayName: creator?.displayName || '',
            bio: creator?.bio || '',
            category: creator?.category || '',
            initUsername: creator?.initUsername || resolvedUsername || ''
          })
          setCurrentStep('profile')
        }
      } catch (error) {
        if (active) {
          setRegistered(false)
        }
      } finally {
        if (active) {
          setChecking(false)
        }
      }
    }

    loadRegistration()

    return () => {
      active = false
    }
  }, [evmAddress, resolvedUsername])

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep)
  const initName = useMemo(
    () => normalizeInitName(form.initUsername || resolvedUsername),
    [form.initUsername, resolvedUsername]
  )

  const handleUsernameNext = () => {
    if (!initName) {
      toast.error(
        'Username required',
        'Register your .init name and set it as primary, or paste it here manually.'
      )
      return
    }

    if (resolvedInitiaAddress || address) {
      setUsernameOverride(resolvedInitiaAddress || address, initName)
    }

    setCurrentStep('profile')
  }

  const handleComplete = async () => {
    if (!resolvedInitiaAddress) {
      openConnect?.()
      toast.error('Connect wallet', 'Connect your Initia wallet before creating a profile.')
      return
    }

    if (!form.displayName || !form.bio || !form.category) {
      toast.error('Missing details', 'Add your display name, category, and bio to continue.')
      return
    }

    setSubmitting(true)

    try {
      const nextInitName = normalizeInitName(form.initUsername || resolvedUsername)

      if (nextInitName) {
        setUsernameOverride(resolvedInitiaAddress, nextInitName)
      }

      const iface = new ethers.Interface(CREATOR_PROFILE_ABI)
      const data = iface.encodeFunctionData('registerCreator', [
        form.displayName,
        form.bio,
        form.category,
        nextInitName
      ])

      const msg = buildMsgCall({
        sender: resolvedInitiaAddress,
        contractAddr: CONTRACTS.profile,
        input: data
      })

      await requestTxSync({ chainId: CHAIN_ID, messages: [msg] })

      setRegistered(true)
      toast.success('Profile created', 'Your creator profile is now live.')
      navigate('/launch')
    } catch (error) {
      toast.error('Registration failed', error?.message || 'Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-12 text-center">
          <h1 className="text-5xl mb-4 dark:text-white">Create Your Profile</h1>
          <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
            Get started in 3 simple steps
          </p>
        </div>

        <div className="mb-12">
          <div className="mx-auto flex max-w-xl items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex
              const isCompleted = index < currentStepIndex || (registered && step.id === 'profile')

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd]'
                          : isActive
                            ? 'scale-110 bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd]'
                            : 'bg-[#f3f4f6] dark:bg-[#2a2a3e]'
                      }`}
                    >
                      <span className={isActive || isCompleted ? 'text-[#1f2937]' : 'text-[#6b7280]'}>
                        {isCompleted ? 'OK' : step.icon}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${isActive ? 'dark:text-white' : 'text-[#6b7280] dark:text-[#9ca3af]'}`}>
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 ? (
                    <div
                      className={`mx-4 h-1 w-24 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd]'
                          : 'bg-[#f3f4f6] dark:bg-[#2a2a3e]'
                      }`}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-2xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] md:p-12">
          {registered ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a7f3d0]/20 to-[#93c5fd]/20 text-3xl">
                OK
              </div>
              <h2 className="dark:text-white">Profile already created</h2>
              <p className="mx-auto max-w-md text-[#6b7280] dark:text-[#9ca3af]">
                Your creator identity is already on-chain. Continue to the launch page to publish your subscription offer.
              </p>
              <button
                onClick={() => navigate('/launch')}
                className="rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
                type="button"
              >
                Continue to Launch
              </button>
            </div>
          ) : null}

          {!registered && currentStep === 'wallet' ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#a7f3d0]/20 to-[#93c5fd]/20 text-3xl">
                Wallet
              </div>
              <h2 className="dark:text-white">Connect Your Wallet</h2>
              <p className="mx-auto max-w-md text-[#6b7280] dark:text-[#9ca3af]">
                Connect your Web3 wallet to get started. Your wallet address will be your unique identifier on Creato3.
              </p>
              <button
                onClick={openConnect}
                className="rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95"
                type="button"
              >
                {address ? 'Wallet Connected!' : 'Connect Wallet'}
              </button>
            </div>
          ) : null}

          {!registered && currentStep === 'username' ? (
            <div className="space-y-6">
              <div className="mb-8 text-center">
                <h2 className="mb-2 dark:text-white">Choose Your Username</h2>
                <p className="text-[#6b7280] dark:text-[#9ca3af]">
                  Pick a unique .init username for your profile
                </p>
              </div>

              <div>
                <label className="mb-2 block dark:text-white">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.initUsername}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, initUsername: event.target.value }))
                    }
                    placeholder="yourname"
                    className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  />
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[#6b7280] dark:text-[#9ca3af]">
                    .init
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  Register at app.testnet.initia.xyz/usernames and make sure you set it as your primary name.
                </p>
              </div>

              <div className="rounded-2xl bg-gradient-to-r from-[#a7f3d0]/10 to-[#93c5fd]/10 p-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                Connected Initia address: {resolvedInitiaAddress || 'Not connected yet'}
              </div>

              <button
                onClick={handleUsernameNext}
                disabled={!initName}
                className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                type="button"
              >
                Continue
              </button>
            </div>
          ) : null}

          {!registered && currentStep === 'profile' ? (
            <div className="space-y-6">
              <div className="mb-8 text-center">
                <h2 className="mb-2 dark:text-white">Complete Your Profile</h2>
                <p className="text-[#6b7280] dark:text-[#9ca3af]">
                  Tell your audience what you create
                </p>
              </div>

              <div>
                <label className="mb-2 block dark:text-white">Category</label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block dark:text-white">Display Name</label>
                <input
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, displayName: event.target.value }))
                  }
                  placeholder="Priya Studio"
                  className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block dark:text-white">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bio: event.target.value }))
                  }
                  placeholder="Tell your audience about yourself and what you create..."
                  rows={4}
                  maxLength={280}
                  className="w-full resize-none rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-6 py-4 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                />
              </div>

              <button
                onClick={handleComplete}
                disabled={submitting || checking || !form.displayName || !form.category || !form.bio}
                className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                type="button"
              >
                {submitting ? 'Creating Profile...' : 'Complete Profile'}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
