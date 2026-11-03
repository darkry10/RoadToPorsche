import { useEffect, useMemo, useState } from 'react'

// Rough starting points only — edit the goal to match your actual build.
const MODELS = [
  { id: 'macan', name: 'Macan', estimate: 65000 },
  { id: 'cayman', name: '718 Cayman', estimate: 75000 },
  { id: 'cayenne', name: 'Cayenne', estimate: 90000 },
  { id: 'taycan', name: 'Taycan', estimate: 105000 },
  { id: 'carrera', name: '911 Carrera', estimate: 125000 },
  { id: 'gt3', name: '911 GT3', estimate: 220000 },
]

const STORAGE_KEY = 'road-to-porsche:v1'

const DEFAULTS = {
  modelId: 'carrera',
  goal: 125000,
  saved: 15000,
  monthly: 1500,
  annualReturn: 4,
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// Months until savings reach the goal, compounding monthly.
function monthsToGoal(saved, monthly, goal, annualReturn) {
  if (saved >= goal) return 0
  const rate = annualReturn / 100 / 12
  let balance = saved
  for (let m = 1; m <= 1200; m++) {
    balance = balance * (1 + rate) + monthly
    if (balance >= goal) return m
  }
  return Infinity
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

function NumberField({ label, value, onChange, prefix, suffix, step = 100 }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        {prefix && <span className="affix">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
        {suffix && <span className="affix">{suffix}</span>}
      </span>
    </label>
  )
}

export default function App() {
  const [state, setState] = useState(loadState)
  const { modelId, goal, saved, monthly, annualReturn } = state

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable — fine, values just won't persist */
    }
  }, [state])

  const update = (patch) => setState((s) => ({ ...s, ...patch }))

  const pickModel = (m) => update({ modelId: m.id, goal: m.estimate })

  const percent = goal > 0 ? (saved / goal) * 100 : 0
  const remaining = Math.max(0, goal - saved)
  const months = useMemo(
    () => monthsToGoal(saved, monthly, goal, annualReturn),
    [saved, monthly, goal, annualReturn],
  )

  const eta = useMemo(() => {
    if (!Number.isFinite(months)) return null
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }, [months])

  const model = MODELS.find((m) => m.id === modelId)
  const milestones = [25, 50, 75, 100]

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Savings tracker</p>
        <h1>Road to Porsche</h1>
        <p className="lede">
          Every deposit is a few more RPM. Set the target, log what's saved, and see when the keys
          land in your hand.
        </p>
      </header>

      <main className="grid">
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
              <dt>Months left</dt>
              <dd>{Number.isFinite(months) ? months : '—'}</dd>
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
            <NumberField label="Saved so far" prefix="$" value={saved}
              onChange={(v) => update({ saved: v })} />
            <NumberField label="Monthly contribution" prefix="$" value={monthly}
              onChange={(v) => update({ monthly: v })} />
            <NumberField label="Expected annual return" suffix="%" value={annualReturn} step={0.5}
              onChange={(v) => update({ annualReturn: v })} />
          </div>

          <button type="button" className="reset" onClick={() => setState(DEFAULTS)}>
            Reset to defaults
          </button>
        </section>
      </main>

      <footer className="foot">
        Your numbers are saved in this browser only. Not affiliated with Porsche AG.
      </footer>
    </div>
  )
}
