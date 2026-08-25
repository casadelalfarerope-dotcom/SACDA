'use client'

import { useState } from 'react'

export interface MesDato { mes: string; aportes: number; gastos: number }
export interface CategoriaDato { label: string; total: number }

// Dataviz palette — slot 1 blue, slot 2 orange (adjacent-pair validated)
const AZUL = '#2a78d6'
const NARANJA = '#eb6834'

function fmt(n: number) {
  if (n >= 1000) return `S/ ${(n / 1000).toFixed(1)}k`
  return `S/ ${Math.round(n)}`
}

// ── Gráfico 1: barras agrupadas — tendencia 6 meses ─────────────────────────
interface TipT { x: number; y: number; mes: string; serie: 'aportes' | 'gastos'; valor: number }

function TendenciaChart({ datos }: { datos: MesDato[] }) {
  const [tip, setTip] = useState<TipT | null>(null)

  const VW = 560, VH = 185
  const pl = 52, pr = 12, pt = 16, pb = 34
  const cw = VW - pl - pr
  const ch = VH - pt - pb
  const n = Math.max(datos.length, 1)
  const slotW = cw / n
  const barW = Math.min(slotW * 0.28, 26)
  const gap = 3

  const maxVal = Math.max(...datos.flatMap(d => [d.aportes, d.gastos]), 1)
  const ticks = [0, maxVal * 0.5, maxVal]

  function bY(v: number) { return pt + ch - (v / maxVal) * ch }
  function bH(v: number) { return Math.max((v / maxVal) * ch, 2) }

  return (
    <div className="relative select-none">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}
        style={{ overflow: 'visible' }}
        aria-label="Tendencia aportes y gastos últimos 6 meses">
        {/* Gridlines */}
        {ticks.map((t, i) => {
          const y = bY(t)
          return (
            <g key={i}>
              <line x1={pl} y1={y} x2={VW - pr} y2={y}
                style={{ stroke: i === 0 ? 'var(--border)' : 'var(--surface-secondary)', strokeWidth: i === 0 ? 1.5 : 1 }} />
              {t > 0 && (
                <text x={pl - 6} y={y + 4} textAnchor="end" fontSize={9}
                  style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>
                  {fmt(t)}
                </text>
              )}
            </g>
          )
        })}

        {/* Barras por mes */}
        {datos.map((d, i) => {
          const cx = pl + slotW * i + slotW / 2
          const x1 = cx - barW - gap / 2
          const x2 = cx + gap / 2
          return (
            <g key={i}>
              <rect x={x1} y={bY(d.aportes)} width={barW} height={bH(d.aportes)} rx={3} fill={AZUL}
                style={{ cursor: 'default' }}
                onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, mes: d.mes, serie: 'aportes', valor: d.aportes })}
                onMouseLeave={() => setTip(null)} />
              <rect x={x2} y={bY(d.gastos)} width={barW} height={bH(d.gastos)} rx={3} fill={NARANJA}
                style={{ cursor: 'default' }}
                onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, mes: d.mes, serie: 'gastos', valor: d.gastos })}
                onMouseLeave={() => setTip(null)} />
              <text x={cx} y={VH - 8} textAnchor="middle" fontSize={10}
                style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>
                {d.mes}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Leyenda */}
      <div className="flex gap-5 justify-center mt-2">
        {([{ color: AZUL, label: 'Aportes' }, { color: NARANJA, label: 'Gastos' }]).map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="inline-block w-3 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {tip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y - 50, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <p className="font-semibold mb-0.5">{tip.mes}</p>
          <p style={{ color: tip.serie === 'aportes' ? AZUL : NARANJA }}>
            {tip.serie === 'aportes' ? 'Aportes' : 'Gastos'}: {fmt(tip.valor)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Gráfico 2 & 3: barras horizontales ──────────────────────────────────────
interface TipH { x: number; y: number; label: string; valor: number }

function BarrasHorizontales({ datos, color, vacio }: { datos: CategoriaDato[]; color: string; vacio: string }) {
  const [tip, setTip] = useState<TipH | null>(null)

  if (datos.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{vacio}</p>
  }

  const maxVal = Math.max(...datos.map(d => d.total), 1)
  const rowH = 34
  const labelW = 96, barAreaW = 200, valueW = 72
  const VW = labelW + barAreaW + valueW
  const VH = datos.length * rowH + 4

  return (
    <div className="relative">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {datos.map((d, i) => {
          const y = i * rowH + rowH / 2
          const bw = Math.max((d.total / maxVal) * barAreaW, 2)
          const lbl = d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label
          return (
            <g key={i} style={{ cursor: 'default' }}
              onMouseEnter={(e) => setTip({ x: e.clientX, y: e.clientY, label: d.label, valor: d.total })}
              onMouseLeave={() => setTip(null)}>
              <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={10}
                style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>
                {lbl}
              </text>
              {/* Track */}
              <rect x={labelW} y={y - 7} width={barAreaW} height={14} rx={3}
                style={{ fill: 'var(--surface-secondary)' }} />
              {/* Bar */}
              <rect x={labelW} y={y - 7} width={bw} height={14} rx={3} fill={color} />
              <text x={labelW + barAreaW + 8} y={y + 4} fontSize={10}
                style={{ fill: 'var(--foreground)', fontFamily: 'system-ui,sans-serif', fontWeight: 500 }}>
                {fmt(d.total)}
              </text>
            </g>
          )
        })}
      </svg>

      {tip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y - 50, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <p className="font-semibold mb-0.5">{tip.label}</p>
          <p style={{ color }}>{fmt(tip.valor)}</p>
        </div>
      )}
    </div>
  )
}

// ── Export principal ─────────────────────────────────────────────────────────
export default function GraficosFinanzas({
  tendencia,
  aportesPorTipo,
  gastosPorCategoria,
}: {
  tendencia: MesDato[]
  aportesPorTipo: CategoriaDato[]
  gastosPorCategoria: CategoriaDato[]
}) {
  return (
    <div className="space-y-4 mb-8">
      {/* Tendencia 6 meses */}
      <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Tendencia — últimos 6 meses</p>
        <TendenciaChart datos={tendencia} />
      </div>

      {/* Breakdown por tipo y categoría */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Aportes por tipo</p>
          <BarrasHorizontales datos={aportesPorTipo} color={AZUL} vacio="Sin aportes este mes" />
        </div>
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Gastos por categoría</p>
          <BarrasHorizontales datos={gastosPorCategoria} color={NARANJA} vacio="Sin gastos este mes" />
        </div>
      </div>
    </div>
  )
}
