const keyFor = (address) => `creato3-subscription-${address?.toLowerCase()}`

export const getSubscriptionConfig = (address) => {
  if (!address) return null
  try {
    const raw = localStorage.getItem(keyFor(address))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const saveSubscriptionConfig = (address, config) => {
  if (!address) return
  localStorage.setItem(keyFor(address), JSON.stringify(config))
}
