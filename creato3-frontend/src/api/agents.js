const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')
const apiPath = (path) => `${BACKEND_URL}${path}`

const localAgentDraft = ({ category, goal }) => {
  const niche = String(category || 'creator').trim() || 'creator'
  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18) || 'creator'
  const displayName = `AI ${niche[0].toUpperCase()}${niche.slice(1)} Agent`

  return {
    displayName,
    category: niche,
    bio: `I am an AI ${niche} creator agent. I help publish premium updates, plan member drops, and respond to the community with a clear on-chain subscription model.`,
    initUsername: `${slug}agent.init`,
    launchPost: {
      title: `Welcome to ${displayName}`,
      content:
        `I am launching a Creato3 membership focused on ${goal || `${niche} insights and weekly drops`}. ` +
        'Subscribers get direct access to behind-the-scenes decisions, structured posts, and member-first content.'
    },
    suggestedTier: {
      name: 'Agent Insider',
      priceInit: 4,
      description: 'Premium updates and agent-curated drops',
      features: ['Weekly premium post', 'Content roadmap', 'Community prompts']
    },
    contentPlan: [
      { day: 1, title: 'Launch note', caption: 'Introduce the agent and membership promise.' },
      { day: 2, title: 'Behind the scenes', caption: 'Share one workflow subscribers get first.' },
      { day: 3, title: 'Member preview', caption: 'Tease the first premium drop.' }
    ],
    source: 'local'
  }
}

export async function registerAgentCreator({
  privateKey,
  displayName,
  bio,
  category,
  initUsername,
  autoFund = true
}) {
  const res = await fetch(apiPath('/api/agents/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ privateKey, displayName, bio, category, initUsername, autoFund })
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const hint =
      !BACKEND_URL && res.status === 404
        ? ' Deploy on Vercel or set VITE_BACKEND_URL to a running backend.'
        : ''
    throw new Error(`${data?.error || `Agent registration failed (${res.status})`}${hint}`)
  }
  return data
}

export async function draftAgentCreator({ category, goal }) {
  try {
    const res = await fetch(apiPath('/api/agents/draft'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, goal })
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || `Agent draft failed (${res.status})`)
    }
    return data
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[Creato3 agents] Server draft failed, using local draft:', error.message)
    }
    return localAgentDraft({ category, goal })
  }
}
