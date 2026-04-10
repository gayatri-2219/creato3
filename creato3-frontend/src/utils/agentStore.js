const KEY = 'creato3_agents_v1'

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(String(raw || ''))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadAgents() {
  if (typeof window === 'undefined') return []
  return safeParse(window.localStorage.getItem(KEY))
}

export function saveAgents(agents) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(Array.isArray(agents) ? agents : []))
}

export function upsertAgent(agent) {
  const list = loadAgents()
  const address = String(agent?.address || '').toLowerCase()
  if (!address) return list

  const existingIndex = list.findIndex((a) => String(a.address || '').toLowerCase() === address)
  const next = {
    ...list[existingIndex],
    ...agent,
    address: agent.address,
    createdAt: agent.createdAt || new Date().toISOString()
  }

  const out =
    existingIndex >= 0
      ? list.map((a, i) => (i === existingIndex ? next : a))
      : [next, ...list]

  saveAgents(out)
  return out
}

export function removeAgent(address) {
  const list = loadAgents()
  const normalized = String(address || '').toLowerCase()
  const out = list.filter((a) => String(a.address || '').toLowerCase() !== normalized)
  saveAgents(out)
  return out
}

