// Shared math + formatting for the savings projection.

export const MAX_MONTHS = 1200 // 100 years: treat anything beyond as "never"

export const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const compactMoney = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const moneyShort = (v) => compactMoney.format(v)

// Balance of one investment after each month, compounding monthly.
// Returns an array of length `months + 1`; index 0 is today's balance.
export function projectInvestment(inv, months) {
  const rate = (Number(inv.rate) || 0) / 100 / 12
  const monthly = Number(inv.monthly) || 0
  let balance = Number(inv.balance) || 0
  const out = [balance]
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + rate) + monthly
    out.push(Math.max(0, balance))
  }
  return out
}

// First month where the combined balance reaches the goal, or Infinity.
export function monthsToGoal(investments, goal) {
  const series = investments.map((inv) => projectInvestment(inv, MAX_MONTHS))
  for (let m = 0; m <= MAX_MONTHS; m++) {
    let total = 0
    for (const s of series) total += s[m]
    if (total >= goal) return m
  }
  return Infinity
}

export function addMonths(months) {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d
}

export function formatMonthYear(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function formatDuration(months) {
  if (!Number.isFinite(months)) return '—'
  if (months === 0) return 'Now'
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}
