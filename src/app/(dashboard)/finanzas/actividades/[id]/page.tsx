import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
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

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/finanzas/actividades"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{actividad.nombre}</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{formatDate(actividad.fecha)}</p>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Ingresos</p>
          <p className="font-bold text-sm" style={{ color: '#16a34a' }}>{fmt(ingresos)}</p>
        </div>
        <div className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Egresos</p>
          <p className="font-bold text-sm" style={{ color: 'var(--error)' }}>{fmt(egresos)}</p>
        </div>
        <div className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>Balance</p>
          <p className="font-bold text-sm" style={{ color: balance >= 0 ? '#16a34a' : 'var(--error)' }}>{fmt(balance)}</p>
        </div>
      </div>

      {/* Add movement */}
      <div className="p-4 rounded-2xl border mb-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Agregar movimiento</p>
        <AgregarMovimientoForm actividadId={id} />
      </div>

      {/* Movement list */}
      <div className="space-y-2">
        {(movimientos ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-2 self-stretch rounded-full" style={{ background: m.tipo === 'ingreso' ? '#16a34a' : 'var(--error)' }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{m.concepto}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} · {formatDate(m.fecha)}
              </p>
            </div>
            <p className="font-bold text-sm" style={{ color: m.tipo === 'ingreso' ? '#16a34a' : 'var(--error)' }}>
              {m.tipo === 'egreso' ? '−' : '+'}{fmt(Number(m.monto))}
            </p>
          </div>
        ))}
        {(!movimientos || movimientos.length === 0) && (
          <p className="text-center py-8 text-sm" style={{ color: 'var(--muted)' }}>Sin movimientos</p>
        )}
      </div>
    </div>
  )
}
