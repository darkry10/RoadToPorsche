import { useEffect, useMemo, useState } from 'react'
import GrowthChart from './GrowthChart.jsx'
import InvestmentCard, { INVESTMENT_TYPES, NumberField } from './InvestmentCard.jsx'
import {
  addMonths,
  formatDuration,
  formatMonthYear,
  money,
  monthsToGoal,
  projectInvestment,
} from './projection.js'

// Rough starting points only — edit the goal to match your actual build.
const MODELS = [
  { id: 'macan', name: 'Macan', estimate: 65000 },
  { id: 'cayman', name: '718 Cayman', estimate: 75000 },
  { id: 'cayenne', name: 'Cayenne', estimate: 90000 },
  { id: 'taycan', name: 'Taycan', estimate: 105000 },
  { id: 'carrera', name: '911 Carrera', estimate: 125000 },
  { id: 'gt3', name: '911 GT3', estimate: 220000 },
]

// One color per investment; picked so neighbours in the stack stay distinct.
const PALETTE = ['#d5001c', '#c9a45c', '#3fb6a8', '#5b8def', '#a77bdc', '#e07b39', '#b8bcc4', '#6fbf5a']
const MAX_INVESTMENTS = PALETTE.length

const STORAGE_KEY = 'road-to-porsche:v2'
const LEGACY_KEY = 'road-to-porsche:v1'

let nextId = 1
const newId = () => `inv-${Date.now().toString(36)}-${nextId++}`

function makeInvestment(typeId, color, overrides = {}) {
  const t = INVESTMENT_TYPES.find((x) => x.id === typeId) ?? INVESTMENT_TYPES[0]
  return { id: newId(), name: t.label, type: t.id, balance: 0, monthly: 0, rate: t.rate, color, ...overrides }
}

function defaults() {
  return {
    modelId: 'carrera',
    goal: 125000,
    investments: [
      makeInvestment('savings', PALETTE[0], { balance: 10000, monthly: 500 }),
      makeInvestment('index', PALETTE[1], { balance: 5000, monthly: 1000 }),
    ],
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (Array.isArray(s.investments) && s.investments.length) return s
    }
    // Carry over numbers saved by the first version of the page.
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const l = JSON.parse(legacy)
      return {
        modelId: l.modelId ?? 'carrera',
        goal: l.goal ?? 125000,
        investments: [
          makeInvestment('other', PALETTE[0], {
            name: 'Savings',
            balance: l.saved ?? 0,
            monthly: l.monthly ?? 0,
            rate: l.annualReturn ?? 4,
          }),
        ],
      }
    }
  } catch {
    /* fall through to defaults */
  }
  return defaults()
}

function Gauge({ percent }) {
  const clamped = Math.max(0, Math.min(100, percent))
  const angle = -90 + (clamped / 100) * 180
  return (
    <svg className="gauge" viewBox="0 0 220 130" role="img"
      aria-label={`${clamped.toFixed(0)} percent of the way there`}>
      <path className="gauge-track" d="M20 115 A90 90 0 0 1 200 115" pathLength="100" />
      <path className="gauge-fill" d="M20 115 A90 90 0 0 1 200 115" pathLength="100"
        strokeDasharray={`${clamped} 100`} />
      {[0, 25, 50, 75, 100].map((t) => {
        const a = ((-180 + (t / 100) * 180) * Math.PI) / 180
        return (
          <line key={t} className="gauge-tick"
            x1={110 + Math.cos(a) * 72} y1={115 + Math.sin(a) * 72}
            x2={110 + Math.cos(a) * 80} y2={115 + Math.sin(a) * 80} />
        )
      })}
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '110px 115px' }}
        className="gauge-needle">
        <line x1="110" y1="115" x2="110" y2="45" />
      </g>
      <circle cx="110" cy="115" r="7" className="gauge-hub" />
    </svg>
  )
}

export default function App() {
  const [state, setState] = useState(loadState)
  const { modelId, goal, investments } = state

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable — values just won't persist */
    }
  }, [state])

  const update = (patch) => setState((s) => ({ ...s, ...patch }))
  const pickModel = (m) => update({ modelId: m.id, goal: m.estimate })

  const updateInvestment = (id, patch) =>
    setState((s) => ({
      ...s,
      investments: s.investments.map((inv) => (inv.id === id ? { ...inv, ...patch } : inv)),
    }))

  const removeInvestment = (id) =>
    setState((s) => ({ ...s, investments: s.investments.filter((inv) => inv.id !== id) }))

  const addInvestment = () =>
    setState((s) => {
      const used = new Set(s.investments.map((i) => i.color))
      const color = PALETTE.find((c) => !used.has(c)) ?? PALETTE[s.investments.length % PALETTE.length]
      return { ...s, investments: [...s.investments, makeInvestment('index', color)] }
    })

  const saved = investments.reduce((sum, inv) => sum + (Number(inv.balance) || 0), 0)
  const monthly = investments.reduce((sum, inv) => sum + (Number(inv.monthly) || 0), 0)
  const percent = goal > 0 ? (saved / goal) * 100 : 0
  const remaining = Math.max(0, goal - saved)

  const months = useMemo(() => monthsToGoal(investments, goal), [investments, goal])

  // Each investment's balance on arrival day, for the cards.
  const atArrival = useMemo(() => {
    if (!Number.isFinite(months)) return null
    const vals = investments.map((inv) => projectInvestment(inv, months)[months])
    const total = vals.reduce((a, b) => a + b, 0) || 1
    return Object.fromEntries(
      investments.map((inv, i) => [inv.id, { value: vals[i], share: (vals[i] / total) * 100 }]),
    )
  }, [investments, months])

  const eta = Number.isFinite(months) ? formatMonthYear(addMonths(months)) : null
  const model = MODELS.find((m) => m.id === modelId)
  const milestones = [25, 50, 75, 100]

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Savings tracker</p>
        <h1>Road to Porsche</h1>
        <p className="lede">
          Every deposit is a few more RPM. Set the target, add each account you're saving in, and
          see when the keys land in your hand.
        </p>
      </header>

      <main>
        <div className="grid">
          <section className="card dash" aria-labelledby="dash-title">
            <h2 id="dash-title" className="sr-only">Progress</h2>
            <Gauge percent={percent} />
            <div className="readout">
              <span className="readout-value">{Math.min(percent, 100).toFixed(1)}%</span>
              <span className="readout-label">
                of the way to a {model ? model.name : 'Porsche'}
              </span>
            </div>

            <dl className="stats">
              <div>
                <dt>Saved</dt>
                <dd>{money.format(saved)}</dd>
              </div>
              <div>
                <dt>To go</dt>
                <dd>{money.format(remaining)}</dd>
              </div>
              <div>
                <dt>Time left</dt>
                <dd>{formatDuration(months)}</dd>
              </div>
              <div>
                <dt>Arrival</dt>
                <dd>{months === 0 ? 'Now!' : eta ?? 'Add a monthly amount'}</dd>
              </div>
            </dl>

            <ol className="milestones">
              {milestones.map((m) => (
                <li key={m} className={percent >= m ? 'done' : ''}>
                  <span className="dot" aria-hidden="true" />
                  <span>{m}%</span>
                  <span className="ms-amount">{money.format((goal * m) / 100)}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="card controls" aria-labelledby="controls-title">
            <h2 id="controls-title">Pick your Porsche</h2>
            <div className="models" role="radiogroup" aria-label="Model">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={m.id === modelId}
                  className={`model ${m.id === modelId ? 'active' : ''}`}
                  onClick={() => pickModel(m)}
                >
                  <span className="model-name">{m.name}</span>
                  <span className="model-price">~{money.format(m.estimate)}</span>
                </button>
              ))}
            </div>
            <p className="hint">Prices are rough starting estimates — set the goal to your real build.</p>

            <div className="fields">
              <NumberField label="Goal" prefix="$" value={goal} step={1000}
                onChange={(v) => update({ goal: v })} />
            </div>

            <dl className="mini-stats">
              <div>
                <dt>Investments</dt>
                <dd>{investments.length}</dd>
              </div>
              <div>
                <dt>Total monthly</dt>
                <dd>{money.format(monthly)}</dd>
              </div>
            </dl>

            <button type="button" className="reset" onClick={() => setState(defaults())}>
              Reset to defaults
            </button>
          </section>
        </div>

        <section className="card chart-card" aria-labelledby="chart-title">
          <div className="section-head">
            <h2 id="chart-title">Projected growth</h2>
            <ul className="legend">
              {investments.map((inv) => (
                <li key={inv.id}>
                  <span className="swatch" style={{ background: inv.color }} />
                  {inv.name || 'Untitled'}
                </li>
              ))}
            </ul>
          </div>
          <GrowthChart investments={investments} goal={goal} months={months} />
        </section>

        <section aria-labelledby="inv-title">
          <div className="section-head">
            <h2 id="inv-title">Investments</h2>
            <p className="hint">Returns are assumptions you set, not predictions.</p>
          </div>
          <div className="inv-grid">
            {investments.map((inv) => (
              <InvestmentCard
                key={inv.id}
                inv={inv}
                canRemove={investments.length > 1}
                onChange={(patch) => updateInvestment(inv.id, patch)}
                onRemove={() => removeInvestment(inv.id)}
                atArrival={atArrival ? atArrival[inv.id].value : null}
                share={atArrival ? atArrival[inv.id].share : 0}
              />
            ))}
            {investments.length < MAX_INVESTMENTS && (
              <button type="button" className="add-card" onClick={addInvestment}>
                <span className="add-plus" aria-hidden="true">+</span>
                Add investment
              </button>
            )}
          </div>
        </section>
      </main>

      <footer className="foot">
        Your numbers are saved in this browser only. Not financial advice. Not affiliated with Porsche AG.
      </footer>
    </div>
  )
}
