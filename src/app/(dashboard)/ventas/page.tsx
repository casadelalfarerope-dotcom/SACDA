import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const estadoVariant: Record<string, 'warning' | 'info' | 'success' | 'error' | 'muted'> = {
  pendiente: 'warning',
  en_progreso: 'info',
  entregado: 'info',
  aprobado: 'success',
  rechazado: 'error',
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tareas')
    .select('*, asignado:personas!tareas_asignado_id_fkey(nombre_completo), solicitante:personas!tareas_solicitante_id_fkey(nombre_completo)')
    .eq('tipo', 'solicitud_venta')
    .order('created_at', { ascending: false })

  if (params.estado) query = query.eq('estado', params.estado)

  const { data: solicitudes } = await query

  const lista = solicitudes ?? []
  const activas = lista.filter((s) => !['aprobado','rechazado'].includes(s.estado))
  const cerradas = lista.filter((s) => ['aprobado','rechazado'].includes(s.estado))

  type Solicitud = (typeof lista)[number]
  function SolicitudCard({ s }: { s: Solicitud }) {
    return (
      <Link href={`/tareas/${s.id}`}
        className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{s.titulo}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {(s.solicitante as any)?.nombre_completo ?? '—'}
            {s.fecha_limite ? ` · ${formatDate(s.fecha_limite)}` : ''}
          </p>
        </div>
        <Badge variant={estadoVariant[s.estado] ?? 'muted'}>{s.estado.replace('_', ' ')}</Badge>
      </Link>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Solicitudes de venta</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{activas.length} activas</p>
        </div>
        <Link href="/tareas/nueva?tipo=solicitud_venta"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {['pendiente','en_progreso','aprobado','rechazado'].map((e) => (
          <Link key={e} href={params.estado === e ? '/ventas' : `/ventas?estado=${e}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border capitalize"
            style={{
              background: params.estado === e ? 'var(--accent)' : 'var(--surface)',
              borderColor: params.estado === e ? 'var(--accent)' : 'var(--border)',
              color: params.estado === e ? '#fff' : 'var(--foreground)',
            }}>
            {e.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {activas.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Activas</p>
          <div className="space-y-2">
            {activas.map((s) => <SolicitudCard key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {cerradas.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Cerradas</p>
          <div className="space-y-2">
            {cerradas.map((s) => <SolicitudCard key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {lista.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Sin solicitudes de venta</p>
      )}
    </div>
  )
}
