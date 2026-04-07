const keyFor = (address) => `creato3-content-${address?.toLowerCase()}`

export const getCreatorContent = (address) => {
  if (!address) return []
  try {
    const raw = localStorage.getItem(keyFor(address))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const saveCreatorContent = (address, items) => {
  if (!address) return
  localStorage.setItem(keyFor(address), JSON.stringify(items))
}

export const addCreatorContent = (address, item) => {
  const list = getCreatorContent(address)
  const next = [item, ...list]
  saveCreatorContent(address, next)
  return next
}

export const updateCreatorContent = (address, item) => {
  const list = getCreatorContent(address)
  const next = list.map((entry) => (entry.id === item.id ? item : entry))
  saveCreatorContent(address, next)
  return next
}

export const deleteCreatorContent = (address, id) => {
  const list = getCreatorContent(address)
  const next = list.filter((entry) => entry.id !== id)
  saveCreatorContent(address, next)
  return next
}
