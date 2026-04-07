import { ethers } from 'ethers'

export const creatorGradients = [
  'from-[#fbcfe8] to-[#ddd6fe]',
  'from-[#a7f3d0] to-[#6ee7b7]',
  'from-[#93c5fd] to-[#bfdbfe]',
  'from-[#ddd6fe] to-[#c4b5fd]',
  'from-[#fecaca] to-[#fbcfe8]',
  'from-[#bfdbfe] to-[#93c5fd]',
  'from-[#fed7aa] to-[#fdba74]',
  'from-[#6ee7b7] to-[#a7f3d0]',
  'from-[#fbcfe8] to-[#fecaca]'
]

export const categoryOptions = [
  { value: 'art', label: 'Art' },
  { value: 'music', label: 'Music' },
  { value: 'photography', label: 'Photography' },
  { value: 'tech', label: 'Tech' },
  { value: 'writing', label: 'Writing' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'food', label: 'Food' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'design', label: 'Design' }
]

export const shortAddress = (value) => (value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '')

export const formatInit = (value) => {
  try {
    return ethers.formatEther(value)
  } catch {
    return '0'
  }
}

export const normalizeInitName = (value) => {
  const next = (value || '').trim()
  if (!next) return ''
  return next.endsWith('.init') ? next : `${next}.init`
}

export const displayNameFromHandle = (value) => {
  const normalized = normalizeInitName(value).replace(/\.init$/, '')
  if (!normalized) return 'Creator'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export const capitalize = (value) => {
  const next = (value || '').trim()
  if (!next) return ''
  return next.charAt(0).toUpperCase() + next.slice(1)
}

export const pickGradient = (seed = '') => {
  const index =
    Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % creatorGradients.length

  return creatorGradients[index]
}

export const resolveCreatorName = (creator, address = '') =>
  creator?.initUsername || creator?.displayName || shortAddress(address)

export const buildExternalUrl = (value) => {
  const next = (value || '').trim()
  if (!next) return ''
  if (next.startsWith('http://') || next.startsWith('https://')) return next
  return `https://${next.replace(/^\/+/, '')}`
}

export const previewMeta = (type) => {
  if (type === 'video') return { kind: 'video', label: 'Video Content' }
  if (type === 'image') return { kind: 'image', label: 'Image' }
  if (type === 'pdf' || type === 'doc') return { kind: 'document', label: 'Document' }
  return { kind: 'document', label: 'Premium Content' }
}
