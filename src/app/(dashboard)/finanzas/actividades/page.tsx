import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDate } from '@/lib/utils'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}

export default async function ActividadesFinancierasPage() {
  const supabase = await createClient()

  const { data: actividades } = await supabase
    .from('actividades_financieras')
    .select('*, actividad_movimientos(tipo, monto)')
    .order('fecha', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/finanzas"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Actividades financieras</h1>
        </div>
        <Link href="/finanzas/actividades/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </Link>
      </div>

      <div className="space-y-3">
        {(actividades ?? []).map((a) => {
          const movs = a.actividad_movimientos as { tipo: string; monto: number }[]
          const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
          const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
          const balance = ingresos - egresos
          return (
            <Link key={a.id} href={`/finanzas/actividades/${a.id}`}
              className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{a.nombre}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(a.fecha)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm" style={{ color: balance >= 0 ? '#16a34a' : 'var(--error)' }}>
                  {fmt(balance)}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {movs.length} mov.
                </p>
              </div>
            </Link>
          )
        })}
        {(!actividades || actividades.length === 0) && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Sin actividades registradas</p>
        )}
      </div>
    </div>
  )
}
