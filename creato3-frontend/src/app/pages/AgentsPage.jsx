import { useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { draftAgentCreator, registerAgentCreator } from '../../api/agents'
import { useToast } from '../../shared/toast'
import { extractTxHash, getTxExplorerUrl, shortTxHash } from '../../utils/txProof'
import { loadAgents, removeAgent, upsertAgent } from '../../utils/agentStore'
import { SparklesIcon, UserCircleIcon } from '../components/icons'

const tabs = [
  { id: 'guide', label: 'Guide' },
  { id: 'create', label: 'Create my agent' },
  { id: 'manage', label: 'Manage my agents' }
]

const truncate = (value) => (value ? `${value.slice(0, 8)}...${value.slice(-6)}` : '')

export function AgentsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('guide')
  const [busy, setBusy] = useState(false)
  const [draftBusy, setDraftBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const [generated, setGenerated] = useState(null)
  const [draft, setDraft] = useState(null)
  const [result, setResult] = useState(null)
  const [agents, setAgents] = useState(() => loadAgents())
  const [agentGoal, setAgentGoal] = useState(
    'launch a premium creator community with weekly drops and member prompts'
  )

  const [form, setForm] = useState({
    displayName: 'AI Creator Agent',
    category: 'creator',
    bio: 'I am an AI agent creator. I publish premium updates and respond to my community.',
    initUsername: ''
  })

  const canSubmit = Boolean(form.displayName.trim() && form.category.trim() && form.bio.trim() && consent)

  const txHash = useMemo(() => extractTxHash(result), [result])

  const handleGenerateWallet = () => {
    const wallet = ethers.Wallet.createRandom()
    setGenerated({
      address: wallet.address,
      privateKey: wallet.privateKey
    })
    toast.success('Wallet generated', 'The server will auto-fund it when sponsor env vars are configured.')
  }

  const handleDraft = async () => {
    setDraftBusy(true)
    try {
      const data = await draftAgentCreator({
        category: form.category.trim() || 'creator',
        goal: agentGoal.trim()
      })
      setDraft(data)
      setForm((prev) => ({
        ...prev,
        displayName: data.displayName || prev.displayName,
        category: data.category || prev.category,
        bio: data.bio || prev.bio,
        initUsername: data.initUsername || prev.initUsername
      }))
      toast.success('Agent profile drafted', 'Review the profile, then generate a wallet.')
    } catch (e) {
      toast.error('Draft failed', e?.message || 'Please try again.')
    } finally {
      setDraftBusy(false)
    }
  }

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error('Missing info', 'Fill the form and acknowledge the private key warning.')
      return
    }
    if (!generated?.privateKey) {
      toast.error('Generate wallet', 'Generate an agent wallet (or paste one) before creating an agent.')
      return
    }

    setBusy(true)
    setResult(null)
    try {
      const data = await registerAgentCreator({
        privateKey: generated.privateKey,
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        category: form.category.trim(),
        initUsername: form.initUsername.trim() || undefined
      })
      setResult(data)
      const next = upsertAgent({
        address: data.address,
        initUsername: data.initUsername,
        displayName: form.displayName.trim(),
        category: form.category.trim(),
        txHash: data.txHash,
        funding: data.funding,
        launchPost: draft?.launchPost,
        suggestedTier: draft?.suggestedTier,
        contentPlan: draft?.contentPlan
      })
      setAgents(next)
      toast.success('Agent created', 'On-chain creator agent registered successfully.')
      setActiveTab('manage')
    } catch (e) {
      toast.error('Agent creation failed', e?.message || 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = (addr) => {
    setAgents(removeAgent(addr))
  }

  const guideMcpConfig = useMemo(() => {
    return {
      mcpServers: {
        creato3: {
          command: 'node',
          args: ['/ABSOLUTE/PATH/TO/my-initia-project/mcp-server/index.js'],
          env: {
            BACKEND_URL: 'http://localhost:3001'
          }
        }
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#fafbfc] pb-20 pt-24 dark:from-[#1a1a2e] dark:to-[#16213e]">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h1 className="mb-3 text-5xl dark:text-white">AI Agents</h1>
          <p className="text-lg text-[#6b7280] dark:text-[#9ca3af]">
            Create an on-chain creator agent, manage it, and connect Claude Desktop via MCP.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`rounded-full px-6 py-3 transition-all ${
                activeTab === t.id
                  ? 'scale-105 bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] shadow-lg'
                  : 'border border-[rgba(0,0,0,0.08)] bg-white hover:scale-105 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e] dark:text-white'
              }`}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'guide' ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#fbcfe8]/20 to-[#ddd6fe]/20">
                  <SparklesIcon className="h-6 w-6 text-[#ddd6fe]" />
                </div>
                <div>
                  <h2 className="dark:text-white">MCP server (Claude Desktop)</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Creato3 exposes tools like pricing advice, content plans, agent registration, and subscribe.
                  </p>
                </div>
              </div>

              <ol className="list-decimal space-y-2 pl-6 text-sm text-[#374151] dark:text-[#d1d5db]">
                <li>Start backend: <code className="rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">npm run dev:backend:simple</code></li>
                <li>
                  Confirm health:{' '}
                  <code className="rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                    curl http://localhost:3001/health
                  </code>
                </li>
                <li>In Claude Desktop, add an MCP server config (stdio) like this:</li>
              </ol>

              <pre className="mt-4 overflow-auto rounded-2xl bg-[#0b1020] p-5 text-xs text-[#e5e7eb]">
                {JSON.stringify(guideMcpConfig, null, 2)}
              </pre>

              <div className="mt-6 rounded-2xl bg-[#f9fafb] p-5 text-sm text-[#6b7280] dark:bg-[#1a1a2e] dark:text-[#9ca3af]">
                <p className="mb-2 font-semibold text-[#111827] dark:text-white">Demo tip</p>
                <p>
                  In your video, show Claude calling: <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">get_pricing_advice</code>,{' '}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">get_ai_content_plan</code>, then{' '}
                  <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">register_agent_creator</code> to produce a real tx hash.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#a7f3d0]/20 to-[#93c5fd]/20">
                  <UserCircleIcon className="h-6 w-6 text-[#6ee7b7]" />
                </div>
                <div>
                  <h2 className="dark:text-white">CLI agent scripts (optional)</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    If you want a terminal proof instead of Claude Desktop.
                  </p>
                </div>
              </div>

              <pre className="overflow-auto rounded-2xl bg-[#0b1020] p-5 text-xs text-[#e5e7eb]">{`# From my-initia-project/
npm run agent:creator -- "My AI Creator" art
npm run agent:content -- 0xCreatorAddress "My AI Creator" art
`}</pre>
            </div>
          </div>
        ) : null}

        {activeTab === 'create' ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <h2 className="mb-2 dark:text-white">Create my agent (AI + on-chain creator)</h2>
              <p className="mb-6 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                This drafts an AI creator profile, creates a disposable testnet wallet, can auto-fund it from the sponsor wallet, and calls <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">POST /api/agents/register</code> to send a real on-chain transaction.
              </p>

              <div className="mb-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] p-6 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                <label className="mb-2 block text-sm dark:text-white">Agent launch goal</label>
                <textarea
                  rows={2}
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  className="w-full resize-y rounded-2xl border border-[rgba(0,0,0,0.08)] bg-white px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#111827] dark:text-white"
                />
                <button
                  onClick={handleDraft}
                  disabled={draftBusy}
                  className="mt-4 rounded-full bg-gradient-to-r from-[#ddd6fe] to-[#a7f3d0] px-6 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  type="button"
                >
                  {draftBusy ? 'Drafting agent...' : 'Generate AI agent profile'}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm dark:text-white">Display name</label>
                  <input
                    value={form.displayName}
                    onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                    className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm dark:text-white">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm dark:text-white">Bio</label>
                  <textarea
                    rows={3}
                    value={form.bio}
                    onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                    className="w-full resize-y rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm dark:text-white">.init username (optional)</label>
                  <input
                    value={form.initUsername}
                    onChange={(e) => setForm((p) => ({ ...p, initUsername: e.target.value }))}
                    placeholder="myagent.init"
                    className="w-full rounded-2xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#93c5fd] dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#fef3c7]/40 to-[#fee2e2]/30 p-5 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                <p className="mb-2 font-semibold text-[#111827] dark:text-white">Important</p>
                <p>
                  Creating an agent requires a private key (demo-only). For safety, generate a new wallet and use only a small amount of testnet funds.
                  Do not reuse your main wallet private key.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={handleGenerateWallet}
                  className="rounded-full border border-[rgba(0,0,0,0.08)] bg-white px-6 py-3 shadow-sm transition-transform hover:scale-105 active:scale-95 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e] dark:text-white"
                  type="button"
                >
                  Generate agent wallet
                </button>
                <label className="flex items-center gap-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="h-4 w-4"
                  />
                  I understand this private key is for demo/testing only
                </label>
              </div>

              {generated ? (
                <div className="mt-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] p-6 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]">
                  <p className="mb-3 text-sm font-medium dark:text-white">Generated wallet</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Address</p>
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                        {generated.address}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Private key (keep safe)</p>
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-white px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                        {generated.privateKey}
                      </code>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(generated.address)}
                      className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm hover:bg-white/70 dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-white/10"
                      type="button"
                    >
                      Copy address
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(generated.privateKey)}
                      className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm hover:bg-white/70 dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-white/10"
                      type="button"
                    >
                      Copy private key
                    </button>
                  </div>
                </div>
              ) : null}

              {draft ? (
                <div className="mt-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-sm dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
                  <h3 className="mb-3 dark:text-white">AI launch kit</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#111827]">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280] dark:text-[#9ca3af]">
                        Welcome post
                      </p>
                      <p className="font-medium dark:text-white">{draft.launchPost?.title}</p>
                      <p className="mt-2 line-clamp-4 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {draft.launchPost?.content}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#111827]">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280] dark:text-[#9ca3af]">
                        Suggested tier
                      </p>
                      <p className="font-medium dark:text-white">
                        {draft.suggestedTier?.name} • {draft.suggestedTier?.priceInit} INIT
                      </p>
                      <p className="mt-2 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                        {draft.suggestedTier?.description}
                      </p>
                    </div>
                  </div>
                  {draft.contentPlan?.length ? (
                    <div className="mt-4 rounded-2xl bg-[#f9fafb] p-4 dark:bg-[#111827]">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280] dark:text-[#9ca3af]">
                        First content moves
                      </p>
                      <div className="grid gap-2 md:grid-cols-3">
                        {draft.contentPlan.slice(0, 3).map((item) => (
                          <p key={item.day} className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                            Day {item.day}: {item.title}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6">
                <button
                  onClick={handleCreate}
                  disabled={busy || !canSubmit}
                  className="w-full rounded-full bg-gradient-to-r from-[#a7f3d0] to-[#93c5fd] px-8 py-4 shadow-lg transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  type="button"
                >
                  {busy ? 'Creating agent...' : 'Create agent on-chain'}
                </button>
              </div>

              {result ? (
                <div className="mt-6 rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-lg dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
                  <h3 className="mb-2 dark:text-white">Created</h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">Agent address</p>
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[#f9fafb] px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                        {result.address}
                      </code>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-[#9ca3af]">.init username</p>
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[#f9fafb] px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                        {result.initUsername || '—'}
                      </code>
                    </div>
                  </div>
                  {txHash ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs text-[#6b7280] dark:text-[#9ca3af]">Tx hash</p>
                      <code className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[#f9fafb] px-4 py-3 text-sm dark:bg-[#111827] dark:text-[#d1d5db]">
                        {txHash}
                      </code>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button
                          onClick={() => navigator.clipboard.writeText(txHash)}
                          className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm transition-colors hover:bg-[#eef2ff] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#312e81]"
                          type="button"
                        >
                          Copy hash
                        </button>
                        {getTxExplorerUrl(txHash) ? (
                          <a
                            href={getTxExplorerUrl(txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm transition-colors hover:bg-[#ecfeff] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#164e63]"
                          >
                            Verify on Initia ({shortTxHash(txHash)})
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {result.funding ? (
                    <div className="mt-4 rounded-2xl bg-[#f9fafb] p-4 text-sm text-[#6b7280] dark:bg-[#111827] dark:text-[#9ca3af]">
                      <p className="font-medium text-[#111827] dark:text-white">Funding</p>
                      <p className="mt-1">
                        {result.funding.funded
                          ? `Auto-funded with ${result.funding.amount} fee-token wei.`
                          : result.funding.reason || 'No funding transfer was needed.'}
                      </p>
                      {result.funding.txHash ? (
                        <p className="mt-1 font-mono text-xs">{shortTxHash(result.funding.txHash)}</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'manage' ? (
          <div className="space-y-6">
            <div className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-white p-8 shadow-xl dark:border-[rgba(255,255,255,0.1)] dark:bg-[#2a2a3e]">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="dark:text-white">My agents</h2>
                  <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                    Stored locally in this browser for demo convenience.
                  </p>
                </div>
                <button
                  onClick={() => setAgents(loadAgents())}
                  className="rounded-full border border-[rgba(0,0,0,0.08)] px-5 py-3 text-sm transition-colors hover:bg-[#f3f4f6] dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-[#1a1a2e]"
                  type="button"
                >
                  Refresh
                </button>
              </div>

              {agents.length ? (
                <div className="space-y-4">
                  {agents.map((a) => (
                    <div
                      key={a.address}
                      className="rounded-3xl border border-[rgba(0,0,0,0.08)] bg-[#f9fafb] p-6 dark:border-[rgba(255,255,255,0.1)] dark:bg-[#1a1a2e]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="mb-1 text-xl font-semibold dark:text-white">
                            {a.displayName || a.initUsername || truncate(a.address)}
                          </p>
                          <p className="text-sm text-[#6b7280] dark:text-[#9ca3af]">
                            {a.category || 'creator'} • {a.initUsername || 'no .init set'} • {truncate(a.address)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => navigator.clipboard.writeText(a.address)}
                            className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm hover:bg-white/70 dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-white/10"
                            type="button"
                          >
                            Copy address
                          </button>
                          {a.txHash ? (
                            <button
                              onClick={() => navigator.clipboard.writeText(a.txHash)}
                              className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm hover:bg-white/70 dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-white/10"
                              type="button"
                            >
                              Copy tx
                            </button>
                          ) : null}
                          {a.txHash && getTxExplorerUrl(a.txHash) ? (
                            <a
                              href={getTxExplorerUrl(a.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm hover:bg-white/70 dark:border-[rgba(255,255,255,0.1)] dark:text-white dark:hover:bg-white/10"
                            >
                              Verify tx
                            </a>
                          ) : null}
                          <button
                            onClick={() => handleRemove(a.address)}
                            className="rounded-full border border-[rgba(0,0,0,0.08)] px-4 py-2 text-sm text-[#dc2626] hover:bg-[#fee2e2] dark:border-[rgba(255,255,255,0.1)] dark:text-[#fca5a5] dark:hover:bg-[#3b1f28]"
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      {a.txHash ? (
                        <p className="mt-3 text-xs text-[#6b7280] dark:text-[#9ca3af]">
                          Last on-chain proof: <span className="font-mono">{shortTxHash(a.txHash)}</span>
                        </p>
                      ) : null}
                      {a.launchPost ? (
                        <div className="mt-4 rounded-2xl bg-white p-4 dark:bg-[#111827]">
                          <p className="mb-1 text-sm font-medium dark:text-white">
                            {a.launchPost.title}
                          </p>
                          <p className="line-clamp-3 text-sm text-[#6b7280] dark:text-[#9ca3af]">
                            {a.launchPost.content}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f9fafb] p-8 text-center dark:bg-[#1a1a2e]">
                  <p className="text-[#6b7280] dark:text-[#9ca3af]">
                    No agents yet. Create one in the “Create my agent” tab.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
