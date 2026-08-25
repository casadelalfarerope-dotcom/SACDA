'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}
function fmtCorto(n: number) {
  if (n >= 1000) return `S/ ${(n / 1000).toFixed(1)}k`
  return `S/ ${Math.round(n)}`
}

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_CORTO  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Tab    = 'resumen' | 'estadisticas'
type Periodo = 'semanal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

interface RawAporte  { monto: number; tipo: string; fecha: string; persona: string | null }
interface RawGasto   { monto: number; concepto: string; categoria: string; fecha: string }
interface RawHistItem { monto: number; fecha: string }
interface MesDato    { mes: string; aportes: number; gastos: number }
interface CategoriaDato { label: string; total: number }

// ── Agregación por período ───────────────────────────────────────────────────

function agregarPorPeriodo(
  aportes: RawHistItem[],
  gastos: RawHistItem[],
  periodo: Periodo
): MesDato[] {
  const hoy = new Date()

  if (periodo === 'semanal') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]!
      return {
        mes: DIAS_CORTO[d.getDay()]!,
        aportes: aportes.filter(a => a.fecha === dateStr).reduce((s, a) => s + a.monto, 0),
        gastos:  gastos.filter(g => g.fecha === dateStr).reduce((s, g) => s + g.monto, 0),
      }
    })
  }

  const n = { bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[periodo]!
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1)
    const m = d.getMonth() + 1
    const a = d.getFullYear()
    const desde = `${a}-${String(m).padStart(2, '0')}-01`
    const hasta  = new Date(a, m, 0).toISOString().split('T')[0]!
    return {
      mes: MESES_CORTO[m - 1]!,
      aportes: aportes.filter(a => a.fecha >= desde && a.fecha <= hasta).reduce((s, a) => s + a.monto, 0),
      gastos:  gastos.filter(g => g.fecha >= desde && g.fecha <= hasta).reduce((s, g) => s + g.monto, 0),
    }
  })
}

function filtrarPorPeriodo<T extends { fecha: string }>(items: T[], periodo: Periodo): T[] {
  const hoy = new Date()
  let desde: string
  if (periodo === 'semanal') {
    const d = new Date(hoy); d.setDate(d.getDate() - 6)
    desde = d.toISOString().split('T')[0]!
  } else {
    const n = { bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[periodo]!
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1), 1)
    desde = d.toISOString().split('T')[0]!
  }
  return items.filter(x => x.fecha >= desde)
}

function topPor<T extends { fecha: string }>(
  items: T[],
  key: keyof T,
  periodo: Periodo
): CategoriaDato[] {
  const filtered = filtrarPorPeriodo(items, periodo)
  const map = new Map<string, number>()
  for (const x of filtered) {
    const k = String(x[key]) || 'otro'
    map.set(k, (map.get(k) ?? 0) + (x as unknown as { monto: number }).monto)
  }
  return [...map.entries()]
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
}

// ── Gráfico barras agrupadas ─────────────────────────────────────────────────

const AZUL   = '#2a78d6'
const NARANJA = '#eb6834'

interface TipBar { x: number; y: number; mes: string; serie: 'aportes' | 'gastos'; valor: number }

function TendenciaChart({ datos }: { datos: MesDato[] }) {
  const [tip, setTip] = useState<TipBar | null>(null)
  const VW = 560, VH = 190
  const pl = 52, pr = 12, pt = 16, pb = 36
  const cw = VW - pl - pr
  const ch = VH - pt - pb
  const n  = Math.max(datos.length, 1)
  const slotW = cw / n
  const barW  = Math.min(slotW * 0.28, 26)
  const gap   = 3
  const maxVal = Math.max(...datos.flatMap(d => [d.aportes, d.gastos]), 1)
  const ticks  = [0, maxVal * 0.5, maxVal]
  const bY = (v: number) => pt + ch - (v / maxVal) * ch
  const bH = (v: number) => Math.max((v / maxVal) * ch, 2)

  return (
    <div className="relative select-none">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: 'visible' }}>
        {ticks.map((t, i) => {
          const y = bY(t)
          return (
            <g key={i}>
              <line x1={pl} y1={y} x2={VW - pr} y2={y}
                style={{ stroke: i === 0 ? 'var(--border)' : 'var(--surface-secondary)', strokeWidth: i === 0 ? 1.5 : 1 }} />
              {t > 0 && (
                <text x={pl - 6} y={y + 4} textAnchor="end" fontSize={9}
                  style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>
                  {fmtCorto(t)}
                </text>
              )}
            </g>
          )
        })}
        {datos.map((d, i) => {
          const cx = pl + slotW * i + slotW / 2
          const x1 = cx - barW - gap / 2
          const x2 = cx + gap / 2
          return (
            <g key={i}>
              <rect x={x1} y={bY(d.aportes)} width={barW} height={bH(d.aportes)} rx={3} fill={AZUL}
                onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, mes: d.mes, serie: 'aportes', valor: d.aportes })}
                onMouseLeave={() => setTip(null)} style={{ cursor: 'default' }} />
              <rect x={x2} y={bY(d.gastos)} width={barW} height={bH(d.gastos)} rx={3} fill={NARANJA}
                onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, mes: d.mes, serie: 'gastos', valor: d.gastos })}
                onMouseLeave={() => setTip(null)} style={{ cursor: 'default' }} />
              <text x={cx} y={VH - 8} textAnchor="middle" fontSize={10}
                style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>{d.mes}</text>
            </g>
          )
        })}
      </svg>
      <div className="flex gap-5 justify-center mt-1">
        {[{ color: AZUL, label: 'Aportes' }, { color: NARANJA, label: 'Gastos' }].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
            <span className="inline-block w-3 h-2.5 rounded-sm flex-shrink-0" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
      {tip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y - 52, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <p className="font-semibold mb-0.5">{tip.mes}</p>
          <p style={{ color: tip.serie === 'aportes' ? AZUL : NARANJA }}>
            {tip.serie === 'aportes' ? 'Aportes' : 'Gastos'}: {fmtCorto(tip.valor)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Gráfico barras horizontales ──────────────────────────────────────────────

interface TipHBar { x: number; y: number; label: string; valor: number }

function BarrasH({ datos, color, vacio }: { datos: CategoriaDato[]; color: string; vacio: string }) {
  const [tip, setTip] = useState<TipHBar | null>(null)
  if (datos.length === 0) {
    return <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{vacio}</p>
  }
  const maxVal = Math.max(...datos.map(d => d.total), 1)
  const rowH = 34, labelW = 96, barW = 200, valW = 72
  const VW = labelW + barW + valW
  const VH = datos.length * rowH + 4
  return (
    <div className="relative">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {datos.map((d, i) => {
          const y  = i * rowH + rowH / 2
          const bw = Math.max((d.total / maxVal) * barW, 2)
          const lbl = d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label
          return (
            <g key={i} style={{ cursor: 'default' }}
              onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, label: d.label, valor: d.total })}
              onMouseLeave={() => setTip(null)}>
              <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={10}
                style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>{lbl}</text>
              <rect x={labelW} y={y - 7} width={barW} height={14} rx={3}
                style={{ fill: 'var(--surface-secondary)' }} />
              <rect x={labelW} y={y - 7} width={bw} height={14} rx={3} fill={color} />
              <text x={labelW + barW + 8} y={y + 4} fontSize={10}
                style={{ fill: 'var(--foreground)', fontFamily: 'system-ui,sans-serif', fontWeight: 500 }}>
                {fmtCorto(d.total)}
              </text>
            </g>
          )
        })}
      </svg>
      {tip && (
        <div className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl text-xs shadow-lg"
          style={{ left: tip.x + 14, top: tip.y - 52, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}>
          <p className="font-semibold mb-0.5">{tip.label}</p>
          <p style={{ color }}>{fmtCorto(tip.valor)}</p>
        </div>
      )}
    </div>
  )
}

// ── Selector de período ──────────────────────────────────────────────────────

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'semanal',    label: 'Semanal'    },
  { value: 'bimestral',  label: 'Bimestral'  },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral'  },
  { value: 'anual',      label: 'Anual'      },
]

// ── Props del componente principal ───────────────────────────────────────────

export interface FinanzasTabsProps {
  // Resumen tab
  aportesMes: RawAporte[]
  gastosMes:  RawGasto[]
  totalAportes: number
  totalGastos:  number
  balance:      number
  mes:   number
  anio:  number
  mesPrevHref: string
  mesSigHref:  string | null
  mesPrevLabel: string
  mesSigLabel:  string
  mesLabel:     string
  // Historial (12 meses) para estadísticas
  aportesHist: { monto: number; tipo: string; fecha: string }[]
  gastosHist:  { monto: number; categoria: string; fecha: string }[]
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function FinanzasTabs(props: FinanzasTabsProps) {
  const [tab, setTab]       = useState<Tab>('resumen')
  const [periodo, setPeriodo] = useState<Periodo>('semestral')

  const { aportesMes, gastosMes, totalAportes, totalGastos, balance } = props

  // Calcular datos para estadísticas
  const tendencia = agregarPorPeriodo(
    props.aportesHist.map(a => ({ monto: a.monto, fecha: a.fecha })),
    props.gastosHist.map(g => ({ monto: g.monto, fecha: g.fecha })),
    periodo
  )
  const aportesPorTipo = topPor(
    props.aportesHist.map(a => ({ ...a })),
    'tipo',
    periodo
  )
  const gastosPorCat = topPor(
    props.gastosHist.map(g => ({ monto: g.monto, categoria: g.categoria, fecha: g.fecha })),
    'categoria',
    periodo
  )

  // Totales del período seleccionado
  const filtAportes = filtrarPorPeriodo(props.aportesHist, periodo)
  const filtGastos  = filtrarPorPeriodo(props.gastosHist, periodo)
  const totalA = filtAportes.reduce((s, a) => s + a.monto, 0)
  const totalG = filtGastos.reduce((s, g) => s + g.monto, 0)
  const balP   = totalA - totalG

  // Estilo de tab activo
  const tabStyle = (t: Tab) => ({
    borderBottom: t === tab ? '2px solid var(--accent)' : '2px solid transparent',
    color: t === tab ? 'var(--accent)' : 'var(--muted)',
    fontWeight: t === tab ? 600 : 400,
  })

  const periodoStyle = (p: Periodo) => ({
    background: p === periodo ? 'var(--accent)' : 'var(--surface-secondary)',
    color: p === periodo ? '#fff' : 'var(--muted)',
    border: '1px solid',
    borderColor: p === periodo ? 'var(--accent)' : 'var(--border)',
  })

  return (
    <>
      {/* Tab bar */}
      <div className="flex border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        {([['resumen', 'Resumen'], ['estadisticas', 'Estadísticas']] as [Tab, string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-5 py-3 text-sm transition-colors"
            style={tabStyle(t)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB RESUMEN ── */}
      {tab === 'resumen' && (
        <>
          {/* Navegación por mes */}
          <div className="flex items-center justify-between mb-6 p-3 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <Link href={props.mesPrevHref}
              className="px-3 py-1.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
              style={{ color: 'var(--muted)' }}>
              &lt; {props.mesPrevLabel}
            </Link>
            <span className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
              {props.mesLabel}
            </span>
            {props.mesSigHref ? (
              <Link href={props.mesSigHref}
                className="px-3 py-1.5 rounded-xl text-sm hover:opacity-70 transition-opacity"
                style={{ color: 'var(--muted)' }}>
                {props.mesSigLabel} &gt;
              </Link>
            ) : (
              <span className="px-3 py-1.5 text-sm" style={{ color: 'var(--muted)', opacity: 0.3 }}>
                {props.mesSigLabel} &gt;
              </span>
            )}
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} style={{ color: '#16a34a' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Aportes</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{fmt(totalAportes)}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} style={{ color: 'var(--error)' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Gastos</span>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--error)' }}>{fmt(totalGastos)}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Balance</p>
              <p className="text-lg font-bold" style={{ color: balance >= 0 ? '#16a34a' : 'var(--error)' }}>
                {fmt(balance)}
              </p>
            </div>
          </div>

          {/* Listas */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  Aportes ({aportesMes.length})
                </p>
                <div className="flex gap-2">
                  <Link href="/finanzas/aportes" className="text-xs flex items-center gap-1 hover:opacity-70"
                    style={{ color: 'var(--accent)' }}>Ver todos <ArrowRight size={11} /></Link>
                  <Link href="/finanzas/aportes/nuevo"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'var(--accent)' }}>
                    <Plus size={11} /> Nuevo
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {aportesMes.slice(0, 8).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {a.persona ?? '—'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {a.tipo} · {a.fecha}
                      </p>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>{fmt(a.monto)}</p>
                  </div>
                ))}
                {aportesMes.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin aportes este mes</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  Gastos ({gastosMes.length})
                </p>
                <div className="flex gap-2">
                  <Link href="/finanzas/gastos" className="text-xs flex items-center gap-1 hover:opacity-70"
                    style={{ color: 'var(--accent)' }}>Ver todos <ArrowRight size={11} /></Link>
                  <Link href="/finanzas/gastos/nuevo"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'var(--accent)' }}>
                    <Plus size={11} /> Nuevo
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {gastosMes.slice(0, 8).map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{g.concepto}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        {g.categoria} · {g.fecha}
                      </p>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--error)' }}>{fmt(g.monto)}</p>
                  </div>
                ))}
                {gastosMes.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin gastos este mes</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB ESTADÍSTICAS ── */}
      {tab === 'estadisticas' && (
        <>
          {/* Selector de período */}
          <div className="flex flex-wrap gap-2 mb-6">
            {PERIODOS.map(({ value, label }) => (
              <button key={value} onClick={() => setPeriodo(value)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                style={periodoStyle(value)}>
                {label}
              </button>
            ))}
          </div>

          {/* Stat tiles del período */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} style={{ color: '#16a34a' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Aportes</span>
              </div>
              <p className="text-lg font-bold" style={{ color: '#16a34a' }}>{fmt(totalA)}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} style={{ color: 'var(--error)' }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Gastos</span>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--error)' }}>{fmt(totalG)}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Balance</p>
              <p className="text-lg font-bold" style={{ color: balP >= 0 ? '#16a34a' : 'var(--error)' }}>
                {fmt(balP)}
              </p>
            </div>
          </div>

          {/* Gráficos */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Tendencia — {PERIODOS.find(p => p.value === periodo)?.label}
              </p>
              <TendenciaChart datos={tendencia} />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Aportes por tipo
                </p>
                <BarrasH datos={aportesPorTipo} color={AZUL} vacio="Sin aportes en este período" />
              </div>
              <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                  Gastos por categoría
                </p>
                <BarrasH datos={gastosPorCat} color={NARANJA} vacio="Sin gastos en este período" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
