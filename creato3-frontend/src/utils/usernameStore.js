const keyFor = (address) => `creato3-username-${address?.toLowerCase()}`

export const getUsernameOverride = (address) => {
  if (!address) return ''
  try {
    return localStorage.getItem(keyFor(address)) || ''
  } catch {
    return ''
  }
}

export const setUsernameOverride = (address, username) => {
  if (!address) return
  try {
    if (username) {
      localStorage.setItem(keyFor(address), username)
    } else {
      localStorage.removeItem(keyFor(address))
    }
  } catch {
    // ignore
  }
}
