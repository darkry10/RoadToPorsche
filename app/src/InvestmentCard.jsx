import { money } from './projection.js'

export const INVESTMENT_TYPES = [
  { id: 'savings', label: 'High-yield savings', rate: 4 },
  { id: 'cd', label: 'CD', rate: 4 },
  { id: 'bonds', label: 'Bonds', rate: 4.5 },
  { id: 'index', label: 'Index fund', rate: 7 },
  { id: 'stocks', label: 'Individual stocks', rate: 8 },
  { id: 'crypto', label: 'Crypto', rate: 10 },
  { id: 'other', label: 'Other', rate: 5 },
]

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

export { NumberField }

export default function InvestmentCard({ inv, onChange, onRemove, canRemove, atArrival, share }) {
  const changeType = (typeId) => {
    const prev = INVESTMENT_TYPES.find((t) => t.id === inv.type)
    const next = INVESTMENT_TYPES.find((t) => t.id === typeId)
    const patch = { type: typeId }
    // Swap in the new type's assumed return, unless the user set their own.
    if (next && (!prev || inv.rate === prev.rate)) patch.rate = next.rate
    // Same for the default name.
    if (next && (!inv.name || inv.name === prev?.label)) patch.name = next.label
    onChange(patch)
  }

  return (
    <article className="card inv-card" style={{ '--accent': inv.color }}>
      <header className="inv-head">
        <span className="swatch lg" style={{ background: inv.color }} aria-hidden="true" />
        <input
          className="inv-name"
          value={inv.name}
          placeholder="Name this investment"
          aria-label="Investment name"
          onChange={(e) => onChange({ name: e.target.value })}
        />
        {canRemove && (
          <button type="button" className="icon-btn" onClick={onRemove}
            aria-label={`Remove ${inv.name || 'investment'}`} title="Remove">
            ×
          </button>
        )}
      </header>

      <label className="field">
        <span className="field-label">Type</span>
        <span className="field-input select">
          <select value={inv.type} onChange={(e) => changeType(e.target.value)}>
            {INVESTMENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </span>
      </label>

      <div className="inv-fields">
        <NumberField label="Current balance" prefix="$" value={inv.balance}
          onChange={(v) => onChange({ balance: v })} />
        <NumberField label="Monthly" prefix="$" value={inv.monthly}
          onChange={(v) => onChange({ monthly: v })} />
        <NumberField label="Annual return" suffix="%" value={inv.rate} step={0.5}
          onChange={(v) => onChange({ rate: v })} />
      </div>

      <footer className="inv-foot">
        {atArrival != null ? (
          <>
            <span>At arrival</span>
            <strong>{money.format(atArrival)}</strong>
            <span className="inv-share">{share.toFixed(0)}% of total</span>
          </>
        ) : (
          <span>Goal not reached in 100 years</span>
        )}
      </footer>
    </article>
  )
}
