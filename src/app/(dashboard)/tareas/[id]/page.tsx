import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, User, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import EntregarTareaForm from '@/components/tareas/EntregarTareaForm'
import AprobarRechazarBtns from '@/components/tareas/AprobarRechazarBtns'
import ConfirmarDistribucionBtn from '@/components/tareas/ConfirmarDistribucionBtn'

const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  entregado: 'Entregado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}
const estadoColor: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  pendiente: 'warning', en_progreso: 'info', entregado: 'default', aprobado: 'success', rechazado: 'error',
}
const tipoLabel: Record<string, string> = {
  diseno: 'Diseño gráfico', solicitud_venta: 'Solicitud de venta', capacitacion: 'Capacitación', otro: 'Otro',
}

export default async function TareaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: tarea }, { data: entregas }, { data: distribuciones }] = await Promise.all([
    supabase.from('tareas')
      .select('*, asignado:asignado_id(nombre_completo), solicitante:solicitante_id(personas(nombre_completo))')
      .eq('id', id)
      .single(),
    supabase.from('tarea_entregas').select('*').eq('tarea_id', id).order('created_at'),
    supabase.from('tarea_distribuciones').select('*').eq('tarea_id', id).order('created_at'),
  ])

  if (!tarea) notFound()

  const puedeEntregar = ['en_progreso', 'pendiente'].includes(tarea.estado)
  const puedeAprobar = tarea.estado === 'entregado'
  const tieneDistribuciones = (distribuciones ?? []).length > 0

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/tareas"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
              {tipoLabel[tarea.tipo] ?? tarea.tipo}
            </span>
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{tarea.titulo}</h1>
        </div>
        <Badge variant={estadoColor[tarea.estado] ?? 'default'}>{estadoLabel[tarea.estado] ?? tarea.estado}</Badge>
      </div>

      <div className="space-y-4">
        {/* Info */}
        <div className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {tarea.descripcion && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>{tarea.descripcion}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {tarea.asignado && (
              <div className="flex items-center gap-2">
                <User size={14} style={{ color: 'var(--muted)' }} />
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>
                  {(tarea.asignado as any).nombre_completo}
                </span>
              </div>
            )}
            {tarea.fecha_limite && (
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: 'var(--muted)' }} />
                <span className="text-sm" style={{ color: 'var(--foreground)' }}>{formatDate(tarea.fecha_limite)}</span>
              </div>
            )}
          </div>
          {tarea.feedback_rechazo && (
            <div className="p-3 rounded-xl" style={{ background: '#fef2f2', borderLeft: '3px solid var(--error)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--error)' }}>Motivo de rechazo</p>
              <p className="text-sm" style={{ color: 'var(--foreground)' }}>{tarea.feedback_rechazo}</p>
            </div>
          )}
        </div>

        {/* Entregas */}
        {(entregas ?? []).length > 0 && (
          <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Entregas</p>
            <div className="space-y-2">
              {(entregas ?? []).map((e) => (
                <div key={e.id} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--surface-secondary)' }}>
                  <div className="flex-1 min-w-0">
                    <a href={e.url_archivo} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline break-all" style={{ color: 'var(--accent)' }}>
                      {e.url_archivo}
                    </a>
                    {e.notas && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{e.notas}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{formatDate(e.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Distribuciones (post-aprobación diseño) */}
        {tieneDistribuciones && (
          <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Distribución</p>
            <div className="space-y-2">
              {(distribuciones ?? []).map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--surface-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <Package size={14} style={{ color: 'var(--muted)' }} />
                    <span className="text-sm font-medium capitalize" style={{ color: 'var(--foreground)' }}>{d.destino}</span>
                  </div>
                  {d.confirmado ? (
                    <span className="text-xs font-medium" style={{ color: '#16a34a' }}>Confirmado</span>
                  ) : (
                    <ConfirmarDistribucionBtn id={d.id} tareaId={tarea.id} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Acciones */}
        {puedeEntregar && (
          <div className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <p className="font-semibold text-sm mb-3" style={{ color: 'var(--foreground)' }}>Subir entrega</p>
            <EntregarTareaForm tareaId={tarea.id} />
          </div>
        )}

        {puedeAprobar && (
          <AprobarRechazarBtns tareaId={tarea.id} />
        )}
      </div>
    </div>
  )
}
