import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ClipboardList, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  entregado: 'Entregado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

const estadoColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pendiente: 'warning',
  en_progreso: 'info',
  entregado: 'default',
  aprobado: 'success',
  rechazado: 'error',
}

const tipoLabel: Record<string, string> = {
  diseno: 'Diseño',
  solicitud_venta: 'Venta',
  capacitacion: 'Capacitación',
  otro: 'Otro',
}

export default async function TareasPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tareas')
    .select('*, personas:asignado_id(nombre_completo)')
    .order('created_at', { ascending: false })

  if (params.tipo) query = query.eq('tipo', params.tipo)
  if (params.estado) query = query.eq('estado', params.estado)

  const { data: tareas } = await query.limit(60)

  const activas = tareas?.filter((t) => !['aprobado', 'rechazado'].includes(t.estado)) ?? []
  const cerradas = tareas?.filter((t) => ['aprobado', 'rechazado'].includes(t.estado)) ?? []

  const chips = (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
      {[
        { label: 'Todas', href: '/tareas' },
        { label: 'Diseño', href: '/tareas?tipo=diseno' },
        { label: 'Ventas', href: '/tareas?tipo=solicitud_venta' },
        { label: 'Pendiente', href: '/tareas?estado=pendiente' },
        { label: 'Entregado', href: '/tareas?estado=entregado' },
      ].map(({ label, href }) => (
        <Link key={href} href={href}
          className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          {label}
        </Link>
      ))}
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Tareas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Flujo de aprobación</p>
        </div>
        <Link href="/tareas/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} /> Nueva
        </Link>
      </div>

      {chips}

      {activas.length > 0 && (
        <section className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Activas</p>
          <div className="space-y-2">
            {activas.map((t) => (
              <Link key={t.id} href={`/tareas/${t.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                      {tipoLabel[t.tipo] ?? t.tipo}
                    </span>
                    {t.fecha_limite && (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatDate(t.fecha_limite)}</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--foreground)' }}>{t.titulo}</p>
                  {t.personas && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      Asignado a {(t.personas as any).nombre_completo}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={estadoColor[t.estado] ?? 'default'}>{estadoLabel[t.estado] ?? t.estado}</Badge>
                  <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {cerradas.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Cerradas</p>
          <div className="space-y-2">
            {cerradas.slice(0, 15).map((t) => (
              <Link key={t.id} href={`/tareas/${t.id}`}
                className="flex items-center gap-4 p-4 rounded-2xl border opacity-60 transition-opacity hover:opacity-80"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" style={{ color: 'var(--foreground)' }}>{t.titulo}</p>
                </div>
                <Badge variant={estadoColor[t.estado] ?? 'default'}>{estadoLabel[t.estado] ?? t.estado}</Badge>
                <ChevronRight size={16} style={{ color: 'var(--muted)' }} />
              </Link>
            ))}
          </div>
        </section>
      )}

      {(!tareas || tareas.length === 0) && (
        <div className="text-center py-16">
          <ClipboardList size={36} className="mx-auto mb-3" style={{ color: 'var(--muted)' }} />
          <p className="font-medium" style={{ color: 'var(--foreground)' }}>Sin tareas</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--muted)' }}>Crea la primera tarea de diseño o solicitud</p>
          <Link href="/tareas/nueva"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Nueva tarea
          </Link>
        </div>
      )}
    </div>
  )
}
