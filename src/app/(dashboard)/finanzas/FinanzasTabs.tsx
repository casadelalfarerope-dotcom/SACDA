'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus, ArrowRight } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}
function fmtCorto(n: number) {
  if (n >= 1000) return `S/ ${(n / 1000).toFixed(1)}k`
  return `S/ ${Math.round(n)}`
}

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const DIAS_CORTO  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
const AZUL    = '#2a78d6'
const NARANJA = '#eb6834'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Tab      = 'resumen' | 'estadisticas'
type Periodo  = 'semanal' | 'mensual' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'

interface RawAporte  { monto: number; tipo: string; fecha: string; persona: string | null }
interface RawGasto   { monto: number; concepto: string; categoria: string; fecha: string }
interface MesDato    { mes: string; aportes: number; gastos: number }
interface CategoriaDato { label: string; total: number }

const PERIODOS: { value: Periodo; label: string }[] = [
  { value: 'semanal',    label: 'Semanal'    },
  { value: 'mensual',    label: 'Mensual'    },
  { value: 'bimestral',  label: 'Bimestral'  },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral',  label: 'Semestral'  },
  { value: 'anual',      label: 'Anual'      },
]

// ── Lógica de fechas ──────────────────────────────────────────────────────────

function rangoDesde(periodo: Periodo): string {
  const hoy = new Date()
  if (periodo === 'semanal') {
    const d = new Date(hoy); d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]!
  }
  const n = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[periodo] ?? 1
  return new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1), 1).toISOString().split('T')[0]!
}

function rangoLabel(periodo: Periodo): string | null {
  if (periodo === 'mensual') return null
  const hoy = new Date()
  if (periodo === 'semanal') {
    const inicio = new Date(hoy); inicio.setDate(hoy.getDate() - 6)
    const fmtDia = (d: Date) =>
      `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`
    const mismoAnio = inicio.getFullYear() === hoy.getFullYear()
    return `${fmtDia(inicio)} – ${fmtDia(hoy)}${mismoAnio ? '' : ` ${hoy.getFullYear()}`} ${hoy.getFullYear()}`
  }
  const n = { bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[periodo as Exclude<Periodo,'semanal'|'mensual'>] ?? 2
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1), 1)
  const fin    = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const mismoAnio = inicio.getFullYear() === fin.getFullYear()
  const fmtMes = (d: Date, conAnio: boolean) =>
    `${MESES_CORTO[d.getMonth()]}${conAnio ? ` ${d.getFullYear()}` : ''}`
  if (mismoAnio) {
    return `${fmtMes(inicio, false)} – ${fmtMes(fin, true)}`
  }
  return `${fmtMes(inicio, true)} – ${fmtMes(fin, true)}`
}

function filtrar<T extends { fecha: string }>(items: T[], periodo: Periodo): T[] {
  if (periodo === 'mensual') return items  // el mensual usa aportesMes / gastosMes directamente
  const desde = rangoDesde(periodo)
  return items.filter(x => x.fecha >= desde)
}

function agregarTendencia(
  aportes: RawAporte[],
  gastos: RawGasto[],
  periodo: Periodo
): MesDato[] {
  const hoy = new Date()

  if (periodo === 'semanal') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(hoy); d.setDate(d.getDate() - (6 - i))
      const ds = d.toISOString().split('T')[0]!
      return {
        mes: DIAS_CORTO[d.getDay()]!,
        aportes: aportes.filter(a => a.fecha === ds).reduce((s, a) => s + a.monto, 0),
        gastos:  gastos.filter(g => g.fecha === ds).reduce((s, g) => s + g.monto, 0),
      }
    })
  }

  const n = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 }[periodo]!
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (n - 1 - i), 1)
    const m = d.getMonth() + 1, a = d.getFullYear()
    const desde = `${a}-${String(m).padStart(2,'0')}-01`
    const hasta  = new Date(a, m, 0).toISOString().split('T')[0]!
    return {
      mes: MESES_CORTO[m - 1]!,
      aportes: aportes.filter(a => a.fecha >= desde && a.fecha <= hasta).reduce((s, a) => s + a.monto, 0),
      gastos:  gastos.filter(g => g.fecha >= desde && g.fecha <= hasta).reduce((s, g) => s + g.monto, 0),
    }
  })
}

function topPorCategoria<T extends { monto: number; fecha: string }>(
  items: T[], campo: keyof T, periodo: Periodo
): CategoriaDato[] {
  const filtrados = filtrar(items, periodo)
  const map = new Map<string, number>()
  for (const x of filtrados) {
    const k = String(x[campo]) || 'otro'
    map.set(k, (map.get(k) ?? 0) + x.monto)
  }
  return [...map.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total).slice(0, 6)
}

// ── Gráfico barras agrupadas ──────────────────────────────────────────────────

interface TipBar { x: number; y: number; mes: string; serie: 'aportes' | 'gastos'; valor: number }

function TendenciaChart({ datos }: { datos: MesDato[] }) {
  const [tip, setTip] = useState<TipBar | null>(null)
  const VW = 560, VH = 190, pl = 52, pr = 12, pt = 16, pb = 36
  const cw = VW - pl - pr, ch = VH - pt - pb
  const n = Math.max(datos.length, 1), slotW = cw / n
  const barW = Math.min(slotW * 0.28, 26), gap = 3
  const maxVal = Math.max(...datos.flatMap(d => [d.aportes, d.gastos]), 1)
  const bY = (v: number) => pt + ch - (v / maxVal) * ch
  const bH = (v: number) => Math.max((v / maxVal) * ch, 2)

  return (
    <div className="relative select-none">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`} style={{ overflow: 'visible' }}>
        {[0, maxVal * 0.5, maxVal].map((t, i) => (
          <g key={i}>
            <line x1={pl} y1={bY(t)} x2={VW - pr} y2={bY(t)}
              style={{ stroke: i === 0 ? 'var(--border)' : 'var(--surface-secondary)', strokeWidth: i === 0 ? 1.5 : 1 }} />
            {t > 0 && <text x={pl - 6} y={bY(t) + 4} textAnchor="end" fontSize={9}
              style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>{fmtCorto(t)}</text>}
          </g>
        ))}
        {datos.map((d, i) => {
          const cx = pl + slotW * i + slotW / 2
          const x1 = cx - barW - gap / 2, x2 = cx + gap / 2
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

// ── Gráfico barras horizontales ───────────────────────────────────────────────

interface TipHBar { x: number; y: number; label: string; valor: number }

function BarrasH({ datos, color, vacio }: { datos: CategoriaDato[]; color: string; vacio: string }) {
  const [tip, setTip] = useState<TipHBar | null>(null)
  if (datos.length === 0) return <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{vacio}</p>
  const maxVal = Math.max(...datos.map(d => d.total), 1)
  const rowH = 34, labelW = 96, barAreaW = 200, valW = 72
  const VW = labelW + barAreaW + valW, VH = datos.length * rowH + 4
  return (
    <div className="relative">
      <svg width="100%" height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        {datos.map((d, i) => {
          const y = i * rowH + rowH / 2
          const bw = Math.max((d.total / maxVal) * barAreaW, 2)
          const lbl = d.label.length > 13 ? d.label.slice(0, 12) + '…' : d.label
          return (
            <g key={i} style={{ cursor: 'default' }}
              onMouseEnter={e => setTip({ x: e.clientX, y: e.clientY, label: d.label, valor: d.total })}
              onMouseLeave={() => setTip(null)}>
              <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={10}
                style={{ fill: 'var(--muted)', fontFamily: 'system-ui,sans-serif' }}>{lbl}</text>
              <rect x={labelW} y={y - 7} width={barAreaW} height={14} rx={3} style={{ fill: 'var(--surface-secondary)' }} />
              <rect x={labelW} y={y - 7} width={bw} height={14} rx={3} fill={color} />
              <text x={labelW + barAreaW + 8} y={y + 4} fontSize={10}
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

// ── Selector de período ───────────────────────────────────────────────────────

function SelectorPeriodo({
  value, onChange, opciones,
}: { value: Periodo; onChange: (p: Periodo) => void; opciones: typeof PERIODOS }) {
  const lbl = rangoLabel(value)
  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-2">
        {opciones.map(({ value: v, label }) => (
          <button key={v} onClick={() => onChange(v)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={{
              background:  v === value ? 'var(--accent)' : 'var(--surface-secondary)',
              color:       v === value ? '#fff' : 'var(--muted)',
              border:      '1px solid',
              borderColor: v === value ? 'var(--accent)' : 'var(--border)',
            }}>
            {label}
          </button>
        ))}
      </div>
      {lbl && (
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
          Mostrando: <span className="font-medium" style={{ color: 'var(--foreground)' }}>{lbl}</span>
        </p>
      )}
    </div>
  )
}

// ── Stat tiles ────────────────────────────────────────────────────────────────

function StatTiles({ totalAportes, totalGastos, balance }: { totalAportes: number; totalGastos: number; balance: number }) {
  return (
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
        <p className="text-lg font-bold" style={{ color: balance >= 0 ? '#16a34a' : 'var(--error)' }}>{fmt(balance)}</p>
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface FinanzasTabsProps {
  aportesMes:   RawAporte[]
  gastosMes:    RawGasto[]
  totalAportes: number
  totalGastos:  number
  balance:      number
  mes:  number; anio: number
  mesPrevHref: string; mesSigHref: string | null
  mesPrevLabel: string; mesSigLabel: string; mesLabel: string
  aportesHist: RawAporte[]
  gastosHist:  RawGasto[]
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function FinanzasTabs(props: FinanzasTabsProps) {
  const [tab,            setTab]            = useState<Tab>('resumen')
  const [periodoResumen, setPeriodoResumen] = useState<Periodo>('mensual')
  const [periodoEst,     setPeriodoEst]     = useState<Periodo>('semestral')

  // ── Datos para Resumen según período ──
  const usaMensual = periodoResumen === 'mensual'
  const aportesFiltR = usaMensual ? props.aportesMes : filtrar(props.aportesHist, periodoResumen)
  const gastosFiltR  = usaMensual ? props.gastosMes  : filtrar(props.gastosHist,  periodoResumen)
  const totalAR  = usaMensual ? props.totalAportes : aportesFiltR.reduce((s, a) => s + a.monto, 0)
  const totalGR  = usaMensual ? props.totalGastos  : gastosFiltR.reduce((s, g) => s + g.monto, 0)
  const balanceR = totalAR - totalGR

  // ── Datos para Estadísticas según período ──
  const tendencia     = agregarTendencia(filtrar(props.aportesHist, periodoEst), filtrar(props.gastosHist, periodoEst), periodoEst)
  const aportesPorTipo = topPorCategoria(props.aportesHist, 'tipo',      periodoEst)
  const gastosPorCat   = topPorCategoria(props.gastosHist,  'categoria', periodoEst)
  const totalAE  = filtrar(props.aportesHist, periodoEst).reduce((s, a) => s + a.monto, 0)
  const totalGE  = filtrar(props.gastosHist,  periodoEst).reduce((s, g) => s + g.monto, 0)
  const balanceE = totalAE - totalGE

  const tabStyle = (t: Tab) => ({
    borderBottom: t === tab ? '2px solid var(--accent)' : '2px solid transparent',
    color:        t === tab ? 'var(--accent)' : 'var(--muted)',
    fontWeight:   t === tab ? 600 : 400,
  } as React.CSSProperties)

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
          {/* Selector de período */}
          <SelectorPeriodo value={periodoResumen} onChange={setPeriodoResumen} opciones={PERIODOS} />

          {/* Navegación por mes — solo si "Mensual" */}
          {usaMensual && (
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
          )}

          <StatTiles totalAportes={totalAR} totalGastos={totalGR} balance={balanceR} />

          {/* Listas */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  Aportes ({aportesFiltR.length})
                </p>
                <div className="flex gap-2">
                  <Link href="/finanzas/aportes" className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--accent)' }}>
                    Ver todos <ArrowRight size={11} />
                  </Link>
                  <Link href="/finanzas/aportes/nuevo"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'var(--accent)' }}>
                    <Plus size={11} /> Nuevo
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {aportesFiltR.slice(0, 10).map((a, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{a.persona ?? '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.tipo} · {a.fecha}</p>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>{fmt(a.monto)}</p>
                  </div>
                ))}
                {aportesFiltR.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin aportes</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  Gastos ({gastosFiltR.length})
                </p>
                <div className="flex gap-2">
                  <Link href="/finanzas/gastos" className="text-xs flex items-center gap-1 hover:opacity-70" style={{ color: 'var(--accent)' }}>
                    Ver todos <ArrowRight size={11} />
                  </Link>
                  <Link href="/finanzas/gastos/nuevo"
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white"
                    style={{ background: 'var(--accent)' }}>
                    <Plus size={11} /> Nuevo
                  </Link>
                </div>
              </div>
              <div className="space-y-2">
                {gastosFiltR.slice(0, 10).map((g, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border"
                    style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{g.concepto}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{g.categoria} · {g.fecha}</p>
                    </div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--error)' }}>{fmt(g.monto)}</p>
                  </div>
                ))}
                {gastosFiltR.length === 0 && (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--muted)' }}>Sin gastos</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB ESTADÍSTICAS ── */}
      {tab === 'estadisticas' && (
        <>
          <SelectorPeriodo value={periodoEst} onChange={setPeriodoEst}
            opciones={PERIODOS.filter(p => p.value !== 'mensual')} />

          <StatTiles totalAportes={totalAE} totalGastos={totalGE} balance={balanceE} />

          <div className="space-y-4">
            <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>
                Tendencia — {PERIODOS.find(p => p.value === periodoEst)?.label}
              </p>
              <TendenciaChart datos={tendencia} />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Aportes por tipo</p>
                <BarrasH datos={aportesPorTipo} color={AZUL} vacio="Sin aportes en este período" />
              </div>
              <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Gastos por categoría</p>
                <BarrasH datos={gastosPorCat} color={NARANJA} vacio="Sin gastos en este período" />
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
