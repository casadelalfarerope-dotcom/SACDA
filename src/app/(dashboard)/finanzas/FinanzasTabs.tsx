'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Grupo, Fila, Tarjeta, Segmentado } from '@/components/ui/ios'
import { formatDateShort } from '@/lib/utils'
import { etiquetaTipoAporte, etiquetaCategoriaGasto } from '@/lib/etiquetas'

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
    <div className="space-y-2">
      <Segmentado etiqueta="Período" valor={value} onChange={onChange}
        opciones={opciones.map((o) => ({ valor: o.value, texto: o.label }))} />
      {lbl && <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>{lbl}</p>}
    </div>
  )
}

// ── Resumen de balance ─────────────────────────────────────────────────────────

function Balance({ totalAportes, totalGastos, balance }: { totalAportes: number; totalGastos: number; balance: number }) {
  return (
    <section aria-label="Balance" className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Balance</p>
      <p className="text-[34px] leading-tight font-bold tabular-nums tracking-tight mt-1"
        style={{ color: balance >= 0 ? 'var(--foreground)' : 'var(--error)' }}>
        {fmt(balance)}
      </p>
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--success) 14%, transparent)' }}>
            <TrendingUp size={16} aria-hidden="true" style={{ color: 'var(--success)' }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>Aportes</span>
            <span className="block text-[15px] font-semibold tabular-nums truncate" style={{ color: 'var(--foreground)' }}>{fmt(totalAportes)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--error) 14%, transparent)' }}>
            <TrendingDown size={16} aria-hidden="true" style={{ color: 'var(--error)' }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>Gastos</span>
            <span className="block text-[15px] font-semibold tabular-nums truncate" style={{ color: 'var(--foreground)' }}>{fmt(totalGastos)}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function AccionesLista({ verHref, nuevoHref, nuevoEtiqueta }: { verHref: string; nuevoHref: string; nuevoEtiqueta: string }) {
  return (
    <span className="flex items-center gap-3 normal-case">
      <Link href={verHref} className="text-[15px]" style={{ color: 'var(--accent)' }}>Ver todos</Link>
      <Link href={nuevoHref} aria-label={nuevoEtiqueta} className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
        <Plus size={16} aria-hidden="true" />
      </Link>
    </span>
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

  const usaMensual = periodoResumen === 'mensual'
  const aportesFiltR = usaMensual ? props.aportesMes : filtrar(props.aportesHist, periodoResumen)
  const gastosFiltR  = usaMensual ? props.gastosMes  : filtrar(props.gastosHist,  periodoResumen)
  const totalAR  = usaMensual ? props.totalAportes : aportesFiltR.reduce((s, a) => s + a.monto, 0)
  const totalGR  = usaMensual ? props.totalGastos  : gastosFiltR.reduce((s, g) => s + g.monto, 0)
  const balanceR = totalAR - totalGR

  const tendencia     = agregarTendencia(filtrar(props.aportesHist, periodoEst), filtrar(props.gastosHist, periodoEst), periodoEst)
  const aportesPorTipo = topPorCategoria(props.aportesHist, 'tipo', periodoEst).map(d => ({ ...d, label: etiquetaTipoAporte(d.label) }))
  const gastosPorCat   = topPorCategoria(props.gastosHist, 'categoria', periodoEst).map(d => ({ ...d, label: etiquetaCategoriaGasto(d.label) }))
  const totalAE  = filtrar(props.aportesHist, periodoEst).reduce((s, a) => s + a.monto, 0)
  const totalGE  = filtrar(props.gastosHist,  periodoEst).reduce((s, g) => s + g.monto, 0)
  const balanceE = totalAE - totalGE

  return (
    <div className="space-y-6">
      <Segmentado etiqueta="Vista" valor={tab} onChange={setTab} ancho
        opciones={[{ valor: 'resumen', texto: 'Resumen' }, { valor: 'estadisticas', texto: 'Estadísticas' }]} />

      {tab === 'resumen' && (
        <>
          <SelectorPeriodo value={periodoResumen} onChange={setPeriodoResumen} opciones={PERIODOS} />

          {usaMensual && (
            <div className="flex items-center justify-between">
              <Link href={props.mesPrevHref} aria-label={`Mes anterior: ${props.mesPrevLabel}`}
                className="inline-flex items-center gap-0.5 text-[15px] hover:opacity-70" style={{ color: 'var(--accent)' }}>
                <ChevronLeft size={18} aria-hidden="true" /> {props.mesPrevLabel}
              </Link>
              <span className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>{props.mesLabel}</span>
              {props.mesSigHref ? (
                <Link href={props.mesSigHref} aria-label={`Mes siguiente: ${props.mesSigLabel}`}
                  className="inline-flex items-center gap-0.5 text-[15px] hover:opacity-70" style={{ color: 'var(--accent)' }}>
                  {props.mesSigLabel} <ChevronRight size={18} aria-hidden="true" />
                </Link>
              ) : <span className="w-16" aria-hidden="true" />}
            </div>
          )}

          <Balance totalAportes={totalAR} totalGastos={totalGR} balance={balanceR} />

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <Grupo titulo={`Aportes (${aportesFiltR.length})`}
              accion={<AccionesLista verHref="/finanzas/aportes" nuevoHref="/finanzas/aportes/nuevo" nuevoEtiqueta="Registrar aporte" />}>
              {aportesFiltR.slice(0, 10).map((a, i) => (
                <Fila key={i} primero={i === 0} titulo={a.persona ?? 'Anónimo'}
                  subtitulo={`${etiquetaTipoAporte(a.tipo)} · ${formatDateShort(a.fecha)}`}
                  detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--success)' }}>+{fmt(a.monto)}</span>} />
              ))}
              {aportesFiltR.length === 0 && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin aportes en este período</span>} />}
            </Grupo>

            <Grupo titulo={`Gastos (${gastosFiltR.length})`}
              accion={<AccionesLista verHref="/finanzas/gastos" nuevoHref="/finanzas/gastos/nuevo" nuevoEtiqueta="Registrar gasto" />}>
              {gastosFiltR.slice(0, 10).map((g, i) => (
                <Fila key={i} primero={i === 0} titulo={g.concepto}
                  subtitulo={`${etiquetaCategoriaGasto(g.categoria)} · ${formatDateShort(g.fecha)}`}
                  detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>−{fmt(g.monto)}</span>} />
              ))}
              {gastosFiltR.length === 0 && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin gastos en este período</span>} />}
            </Grupo>
          </div>
        </>
      )}

      {tab === 'estadisticas' && (
        <>
          <SelectorPeriodo value={periodoEst} onChange={setPeriodoEst} opciones={PERIODOS.filter(p => p.value !== 'mensual')} />
          <Balance totalAportes={totalAE} totalGastos={totalGE} balance={balanceE} />
          <Tarjeta titulo={`Tendencia · ${PERIODOS.find(p => p.value === periodoEst)?.label}`}>
            <TendenciaChart datos={tendencia} />
          </Tarjeta>
          <div className="grid md:grid-cols-2 gap-4">
            <Tarjeta titulo="Aportes por tipo">
              <BarrasH datos={aportesPorTipo} color={AZUL} vacio="Sin aportes en este período" />
            </Tarjeta>
            <Tarjeta titulo="Gastos por categoría">
              <BarrasH datos={gastosPorCat} color={NARANJA} vacio="Sin gastos en este período" />
            </Tarjeta>
          </div>
        </>
      )}
    </div>
  )
}
