import { useEffect, useMemo, useState } from 'react'
import { ethers } from 'ethers'
import { motion } from 'framer-motion'
import { useInterwovenKit } from '@initia/interwovenkit-react'
import {
  getContentStrategy,
  getRevenuePrediction,
  getSmartPricing
} from '../api/creatorAI'
import { BridgeButton } from './BridgeButton'
import { SubscribeButton } from './SubscribeFlow'

const DEFAULT_NICHE = 'coding'
const DEFAULT_PLATFORM = 'YouTube'
const DEMO_PRICE_WEI = 1000000000000000n

const toNumber = (value) => {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  return Number(cleaned || 0)
}

export default function AIPricingAdvisor({ embedded = false }) {
  const { address } = useInterwovenKit()
  const [niche, setNiche] = useState(DEFAULT_NICHE)
  const [audience, setAudience] = useState(12000)
  const [platform, setPlatform] = useState(DEFAULT_PLATFORM)

  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingError, setPricingError] = useState('')
  const [tiers, setTiers] = useState([])
  const [reasoning, setReasoning] = useState('')
  const [expectedConversion, setExpectedConversion] = useState('')

  const [selectedTier, setSelectedTier] = useState(null)

  const [conversionPct, setConversionPct] = useState(3)
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [revenueError, setRevenueError] = useState('')
  const [revenue, setRevenue] = useState(null)

  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const [contentIdeas, setContentIdeas] = useState(null)

  const handlePricing = async () => {
    setPricingError('')
    setPricingLoading(true)
    setRevenue(null)
    setContentIdeas(null)
    try {
      const data = await getSmartPricing({
        niche,
        subscribers: audience,
        platform
      })
      setTiers(data.tiers || [])
      setReasoning(data.reasoning || '')
      setExpectedConversion(data.expected_conversion_pct || '')
    } catch (err) {
      setPricingError(err.message || 'Failed to fetch pricing')
    } finally {
      setPricingLoading(false)
    }
  }

  useEffect(() => {
    if (tiers.length === 0) return
    let cancelled = false
    const timer = setTimeout(async () => {
      setRevenueLoading(true)
      setRevenueError('')
      try {
        const data = await getRevenuePrediction({
          tiers,
          subscriberCount: audience,
          conversionPct
        })
        if (cancelled === false) setRevenue(data)
      } catch (err) {
        if (cancelled === false) {
          setRevenueError(err.message || 'Failed to fetch revenue')
        }
      } finally {
        if (cancelled === false) setRevenueLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [tiers, audience, conversionPct])

  const handleContentIdeas = async () => {
    setContentLoading(true)
    setContentError('')
    try {
      const data = await getContentStrategy({
        niche,
        audience
      })
      setContentIdeas(data)
    } catch (err) {
      setContentError(err.message || 'Failed to fetch content ideas')
    } finally {
      setContentLoading(false)
    }
  }

  const chart = useMemo(() => {
    if (revenue === null) return null
    const creato3 = toNumber(revenue.monthly_creato3)
    const patreon = toNumber(revenue.monthly_patreon)
    const substack = toNumber(revenue.monthly_substack)
    const max = Math.max(creato3, patreon, substack, 1)
    return {
      max,
      rows: [
        { name: 'Creato3', value: creato3, accent: 'from-emerald-400 to-emerald-500' },
        { name: 'Patreon', value: patreon, accent: 'from-orange-400 to-orange-500' },
        { name: 'Substack', value: substack, accent: 'from-yellow-400 to-yellow-500' }
      ]
    }
  }, [revenue])

  return (
    <div className={embedded ? 'space-y-6' : 'mx-auto w-full max-w-6xl space-y-8 px-4 pb-16 pt-8'}>
      {embedded === false ? (
        <section className="glass flex flex-col gap-6 p-8">
          <span className="badge w-fit">AI Pricing Advisor</span>
          <div>
            <h2 className="text-3xl font-semibold">Price like the top 1% of creators.</h2>
            <p className="mt-2 text-slate-300">
              Creato3 keeps AI off-chain and payments on-chain. Get tier pricing,
              revenue predictions, and content strategy in one pass.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: 'Zero fees', value: '0% cut' },
              { label: 'Auto-sign', value: 'No popups' },
              { label: 'Bridge', value: '1 click' }
            ].map((item) => (
              <div key={item.label} className="glass-soft p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                <p className="text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {embedded === false ? (
        <section className="glass p-6">
          <h3 className="text-xl font-semibold">Bridge to Creato3</h3>
          <p className="mt-2 text-slate-400">
            New fans can bridge INIT from L1 in one click before subscribing.
          </p>
          <div className="mt-4">
            <BridgeButton
              requiredAmount={ethers.formatEther(DEMO_PRICE_WEI)}
              onBridgeComplete={() => {}}
            />
          </div>
        </section>
      ) : null}

      <section className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-semibold">Smart pricing input</h3>
          <span className="text-xs text-slate-400">Off-chain AI · on-chain payments</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-2">
            <span className="label">Your niche</span>
            <input
              className="input"
              type="text"
              value={niche}
              onChange={(event) => setNiche(event.target.value)}
              placeholder="coding, music, cooking"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Audience size</span>
            <input
              className="accent-primary"
              type="range"
              min="100"
              max="100000"
              step="100"
              value={audience}
              onChange={(event) => setAudience(Number(event.target.value))}
            />
            <span className="text-sm text-slate-400">{audience.toLocaleString()} followers</span>
          </label>
          <label className="flex flex-col gap-2">
            <span className="label">Platform</span>
            <select
              className="input"
              value={platform}
              onChange={(event) => setPlatform(event.target.value)}
            >
              <option>YouTube</option>
              <option>Twitter</option>
              <option>Newsletter</option>
              <option>Instagram</option>
            </select>
          </label>
        </div>
        <button
          className="btn-primary mt-5"
          onClick={handlePricing}
          disabled={pricingLoading}
        >
          {pricingLoading ? 'Thinking…' : 'Get AI Pricing'}
        </button>
        {pricingError ? <p className="mt-3 text-sm text-danger">{pricingError}</p> : null}
      </section>

      <section className="glass p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-semibold">Suggested tiers</h3>
          {expectedConversion ? (
            <span className="text-xs text-slate-400">Expected conversion: {expectedConversion}%</span>
          ) : null}
        </div>
        {tiers.length === 0 ? (
          <p className="mt-4 text-slate-400">Run the AI pricing to see tier recommendations.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {tiers.map((tier, index) => (
              <motion.article
                key={tier.name + index}
                whileHover={{ y: -6 }}
                className="glass-soft flex h-full flex-col gap-3 p-5"
              >
                <h4 className="text-lg font-semibold">{tier.name}</h4>
                <p className="text-3xl font-semibold">${tier.price_usd}</p>
                <p className="text-sm text-slate-400">{tier.description}</p>
                <ul className="text-sm text-slate-300">
                  {(tier.benefits || []).map((benefit, idx) => (
                    <li key={`${tier.name}-benefit-${idx}`}>• {benefit}</li>
                  ))}
                </ul>
                <button
                  className="btn-secondary mt-auto"
                  onClick={() =>
                    setSelectedTier({
                      name: tier.name,
                      price: tier.price_usd,
                      description: tier.description
                    })
                  }
                >
                  Apply this tier
                </button>
              </motion.article>
            ))}
          </div>
        )}
        {reasoning ? <p className="mt-4 text-sm text-slate-400">{reasoning}</p> : null}
      </section>

      <section className="glass p-6">
        <h3 className="text-xl font-semibold">Revenue prediction</h3>
        <div className="mt-4 flex items-center gap-4">
          <input
            className="accent-primary"
            type="range"
            min="1"
            max="10"
            value={conversionPct}
            onChange={(event) => setConversionPct(Number(event.target.value))}
          />
          <span className="text-sm text-slate-400">{conversionPct}% conversion</span>
        </div>
        {revenueLoading ? <p className="mt-3 text-sm text-slate-400">Calculating revenue…</p> : null}
        {revenueError ? <p className="mt-3 text-sm text-danger">{revenueError}</p> : null}
        {chart ? (
          <div className="mt-5 space-y-4">
            {chart.rows.map((row) => (
              <div key={row.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{row.name}</span>
                  <span className="font-mono">${row.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(row.value / chart.max) * 100}%` }}
                    transition={{ duration: 0.6 }}
                    className={`h-2 rounded-full bg-gradient-to-r ${row.accent}`}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {revenue?.annual_extra_creato3 ? (
          <p className="mt-5 text-lg font-semibold text-emerald-300">
            You keep ${revenue.annual_extra_creato3} extra per year on Creato3
          </p>
        ) : null}
        {revenue?.key_insight ? <p className="mt-2 text-sm text-slate-400">{revenue.key_insight}</p> : null}
      </section>

      <section className="glass p-6">
        <h3 className="text-xl font-semibold">Content strategy</h3>
        <button
          className="btn-secondary mt-4"
          onClick={handleContentIdeas}
          disabled={contentLoading}
        >
          {contentLoading ? 'Generating ideas…' : 'Get content ideas for each tier'}
        </button>
        {contentError ? <p className="mt-3 text-sm text-danger">{contentError}</p> : null}
        {contentIdeas ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {contentIdeas.tiers?.map((tier, index) => (
              <div key={tier.name + index} className="glass-soft flex flex-col gap-3 p-4">
                <h4 className="text-lg font-semibold">{tier.name}</h4>
                <p className="text-sm text-slate-400">{tier.why_subscribers_stay}</p>
                <ul className="text-sm text-slate-300">
                  {(tier.benefits || []).map((benefit, idx) => (
                    <li key={`${tier.name}-idea-${idx}`}>• {benefit}</li>
                  ))}
                </ul>
                <span className="badge w-fit">Cadence: {tier.cadence}</span>
              </div>
            ))}
            {contentIdeas.top_tip ? (
              <div className="glass-soft p-4 md:col-span-3">
                <p className="text-sm text-slate-300">{contentIdeas.top_tip}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {embedded === false ? (
        <section className="glass p-6">
          <h3 className="text-xl font-semibold">Subscribe (auto-sign demo)</h3>
          <p className="mt-2 text-sm text-slate-400">
            Toggle auto-sign to remove the wallet popup for each subscription.
          </p>
          <div className="mt-4">
            {address ? (
              <SubscribeButton creator={address} tierId={0} price={DEMO_PRICE_WEI} />
            ) : (
              <p className="text-sm text-slate-400">Connect wallet to test auto-sign subscriptions.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="glass p-6">
        <h3 className="text-xl font-semibold">Create tier (prefilled)</h3>
        {selectedTier ? (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-2">
              <span className="label">Tier name</span>
              <input type="text" className="input" value={selectedTier.name} readOnly />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Price / month</span>
              <input type="text" className="input" value={selectedTier.price} readOnly />
            </label>
            <label className="flex flex-col gap-2">
              <span className="label">Description</span>
              <textarea className="input" value={selectedTier.description} readOnly rows={3} />
            </label>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Click “Apply this tier” on a card to prefill.</p>
        )}
      </section>
    </div>
  )
}
