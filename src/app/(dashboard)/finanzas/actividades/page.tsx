import { createClient } from '@/lib/supabase/server'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
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
    <Pagina titulo="Actividades" subtitulo="Ingresos y egresos por actividad" volver={{ href: '/finanzas', texto: 'Finanzas' }}
      acciones={<BotonEnlace href="/finanzas/actividades/nueva" etiqueta="Nueva actividad"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Nueva</span></BotonEnlace>}>
      {(!actividades || actividades.length === 0) ? <Vacio titulo="Sin actividades" texto="Registra una pollada, bazar u otra actividad para llevar su balance." /> : (
        <Grupo>
          {actividades.map((a, i) => {
            const movs = a.actividad_movimientos as { tipo: string; monto: number }[]
            const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + Number(m.monto), 0)
            const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + Number(m.monto), 0)
            const balance = ingresos - egresos
            return (
              <Fila key={a.id} href={`/finanzas/actividades/${a.id}`} primero={i === 0}
                titulo={a.nombre} subtitulo={`${formatDate(a.fecha)} · ${movs.length} movimientos`}
                detalle={<span className="font-semibold tabular-nums" style={{ color: balance >= 0 ? 'var(--success)' : 'var(--error)' }}>{fmt(balance)}</span>} />
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
