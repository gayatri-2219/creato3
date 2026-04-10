const keyFor = (address) => `creato3-profile-${address?.toLowerCase()}`

export const defaultProfilePreferences = {
  headline: '',
  about: '',
  avatarDataUrl: '',
  avatarGradient: '',
  avatarEmoji: ''
}

export const getProfilePreferences = (address) => {
  if (!address) return { ...defaultProfilePreferences }

  try {
    const raw = localStorage.getItem(keyFor(address))
    return raw ? { ...defaultProfilePreferences, ...JSON.parse(raw) } : { ...defaultProfilePreferences }
  } catch {
    return { ...defaultProfilePreferences }
  }
}

export const saveProfilePreferences = (address, preferences) => {
  if (!address) return

  try {
    localStorage.setItem(
      keyFor(address),
      JSON.stringify({ ...defaultProfilePreferences, ...(preferences || {}) })
    )
  } catch {
    // ignore
  }
}
