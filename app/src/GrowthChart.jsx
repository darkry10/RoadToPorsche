import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addMonths,
  formatMonthYear,
  money,
  moneyShort,
  projectInvestment,
} from './projection.js'

const PAD = { top: 16, right: 12, bottom: 30, left: 52 }
const MAX_POINTS = 160

function niceStep(raw) {
  const pow = 10 ** Math.floor(Math.log10(raw))
  const n = raw / pow
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10
  return nice * pow
}

// Stacked-area projection of every investment, with the goal as a dashed line.
export default function GrowthChart({ investments, goal, months }) {
  const wrapRef = useRef(null)
  const svgRef = useRef(null)
  const [hover, setHover] = useState(null)
  const [W, setW] = useState(720)

  // Draw at the container's real pixel width so labels never shrink on phones.
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      setW(Math.max(280, Math.round(entry.contentRect.width)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const narrow = W < 520
  const H = narrow ? 240 : 300
  const PLOT_W = W - PAD.left - PAD.right
  const PLOT_H = H - PAD.top - PAD.bottom

  // Show a little past the arrival date; 30 years if the goal is never reached.
  const horizon = Number.isFinite(months)
    ? Math.min(600, Math.max(12, Math.ceil(months * 1.15) + 2))
    : 360

  const data = useMemo(() => {
    const step = Math.max(1, Math.ceil(horizon / MAX_POINTS))
    const idx = []
    for (let m = 0; m <= horizon; m += step) idx.push(m)
    if (idx[idx.length - 1] !== horizon) idx.push(horizon)

    const series = investments.map((inv) => {
      const full = projectInvestment(inv, horizon)
      return idx.map((m) => full[m])
    })

    // Running totals, so layer i sits on top of layers 0..i-1.
    const stacks = []
    let below = idx.map(() => 0)
    for (const s of series) {
      const top = s.map((v, i) => below[i] + v)
      stacks.push({ bottom: below, top })
      below = top
    }
    const totals = below
    const maxTotal = Math.max(...totals, 0)
    const rawMax = Math.max(goal * 1.12, maxTotal * 1.04, 1000)
    const yStep = niceStep(rawMax / 4)
    const yMax = Math.ceil(rawMax / yStep) * yStep

    return { idx, series, stacks, totals, yMax, yStep }
  }, [investments, goal, horizon])

  const x = (m) => PAD.left + (m / horizon) * PLOT_W
  const y = (v) => PAD.top + PLOT_H - (v / data.yMax) * PLOT_H

  const areaPath = ({ bottom, top }) => {
    const up = data.idx.map((m, i) => `${x(m).toFixed(1)},${y(top[i]).toFixed(1)}`)
    const down = data.idx
      .map((m, i) => `${x(m).toFixed(1)},${y(bottom[i]).toFixed(1)}`)
      .reverse()
    return `M${up.join('L')}L${down.join('L')}Z`
  }

  const linePath = (vals) =>
    'M' + data.idx.map((m, i) => `${x(m).toFixed(1)},${y(vals[i]).toFixed(1)}`).join('L')

  // Axis ticks
  const yTicks = []
  for (let v = 0; v <= data.yMax + 1e-6; v += data.yStep) yTicks.push(v)

  const years = horizon / 12
  const yearStep = years <= 2 ? (narrow ? 1 : 0.5) : niceStep(years / (narrow ? 3 : 6))
  const xTicks = []
  for (let yr = 0; yr <= years + 1e-6; yr += yearStep) xTicks.push(Math.round(yr * 12))

  const onMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const m = ((px - PAD.left) / PLOT_W) * horizon
    if (m < -horizon * 0.02 || m > horizon * 1.02) return setHover(null)
    let best = 0
    for (let i = 1; i < data.idx.length; i++) {
      if (Math.abs(data.idx[i] - m) < Math.abs(data.idx[best] - m)) best = i
    }
    setHover(best)
  }

  const goalY = y(goal)
  const hoverM = hover != null ? data.idx[hover] : null
  const tipLeft = hoverM != null && x(hoverM) > W * 0.6

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Projected combined balance of all investments over time"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} />
            <text className="axis-label" x={PAD.left - 8} y={y(v)} textAnchor="end" dy="0.32em">
              {moneyShort(v)}
            </text>
          </g>
        ))}
        {xTicks.map((m) => (
          <text key={m} className="axis-label" x={x(m)} y={H - 10} textAnchor="middle">
            {m === 0 ? 'Now' : `${+(m / 12).toFixed(1)}y`}
          </text>
        ))}

        {data.stacks.map((s, i) => (
          <path key={investments[i].id} d={areaPath(s)} fill={investments[i].color}
            className="area" />
        ))}
        {data.stacks.map((s, i) => (
          <path key={`l-${investments[i].id}`} d={linePath(s.top)} stroke={investments[i].color}
            className="area-edge" />
        ))}

        <line className="goal-line" x1={PAD.left} x2={W - PAD.right} y1={goalY} y2={goalY} />
        <text className="goal-label" x={PAD.left + 6} y={goalY - 7}>
          Goal {money.format(goal)}
        </text>

        {Number.isFinite(months) && months > 0 && (
          <g>
            <line className="arrival-line" x1={x(months)} x2={x(months)} y1={PAD.top}
              y2={PAD.top + PLOT_H} />
            <circle className="arrival-dot" cx={x(months)} cy={goalY} r="5" />
          </g>
        )}

        {hoverM != null && (
          <line className="hover-line" x1={x(hoverM)} x2={x(hoverM)} y1={PAD.top}
            y2={PAD.top + PLOT_H} />
        )}
      </svg>

      {hoverM != null && (
        <div
          className="chart-tip"
          style={{
            left: `${(x(hoverM) / W) * 100}%`,
            transform: tipLeft ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)',
          }}
        >
          <div className="tip-date">{formatMonthYear(addMonths(hoverM))}</div>
          {investments.map((inv, i) => (
            <div key={inv.id} className="tip-row">
              <span className="swatch" style={{ background: inv.color }} />
              <span className="tip-name">{inv.name || 'Untitled'}</span>
              <span className="tip-val">{money.format(data.series[i][hover])}</span>
            </div>
          ))}
          <div className="tip-row tip-total">
            <span className="tip-name">Total</span>
            <span className="tip-val">{money.format(data.totals[hover])}</span>
          </div>
        </div>
      )}
    </div>
  )
}
