import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import AgregarMovimientoForm from '@/components/finanzas/AgregarMovimientoForm'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}

export default async function ActividadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: actividad }, { data: movimientos }] = await Promise.all([
    supabase.from('actividades_financieras').select('*').eq('id', id).single(),
    supabase.from('actividad_movimientos').select('*').eq('actividad_id', id).order('fecha', { ascending: false }),
  ])

  if (!actividad) notFound()

  const ingresos = (movimientos ?? []).filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
  const egresos = (movimientos ?? []).filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
  const balance = ingresos - egresos

  const Monto = ({ t, v, c }: { t: string; v: number; c: string }) => (
    <div className="min-w-0">
      <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{t}</p>
      <p className="text-[17px] font-semibold tabular-nums truncate" style={{ color: c }}>{fmt(v)}</p>
    </div>
  )
  return (
    <Pagina ancho="estrecho" titulo={actividad.nombre} subtitulo={formatDate(actividad.fecha)}
      volver={{ href: '/finanzas/actividades', texto: 'Actividades' }}>
      <section aria-label="Balance" className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Balance</p>
        <p className="text-[34px] leading-tight font-bold tabular-nums tracking-tight" style={{ color: balance >= 0 ? 'var(--foreground)' : 'var(--error)' }}>{fmt(balance)}</p>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Monto t="Ingresos" v={ingresos} c="var(--success)" />
          <Monto t="Egresos" v={egresos} c="var(--error)" />
        </div>
      </section>

      <Tarjeta titulo="Agregar movimiento">
        <AgregarMovimientoForm actividadId={id} />
      </Tarjeta>

      <Grupo titulo="Movimientos">
        {(movimientos ?? []).map((m, i) => (
          <Fila key={m.id} primero={i === 0} titulo={m.concepto}
            subtitulo={`${m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} · ${formatDate(m.fecha)}`}
            detalle={<span className="font-semibold tabular-nums" style={{ color: m.tipo === 'ingreso' ? 'var(--success)' : 'var(--foreground)' }}>
              {m.tipo === 'egreso' ? '−' : '+'}{fmt(Number(m.monto))}</span>} />
        ))}
        {(!movimientos || movimientos.length === 0) && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin movimientos</span>} />}
      </Grupo>
    </Pagina>
  )
}
