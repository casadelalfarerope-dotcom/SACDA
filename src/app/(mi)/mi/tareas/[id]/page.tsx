import { notFound } from 'next/navigation'
import { Link as LinkIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import EntregarTareaForm from '@/components/tareas/EntregarTareaForm'

export default async function MiTareaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await contextoEspacio()
  const supabase = await createClient()

  // RLS solo devuelve la tarea si está asignada a esta persona (o si tiene permiso).
  const { data: tarea } = await supabase.from('tareas')
    .select('id, titulo, descripcion, estado, fecha_limite, feedback_rechazo, asignado_id')
    .eq('id', id).maybeSingle()
  if (!tarea || tarea.asignado_id !== ctx.personaId) notFound()

  const { data: entregas } = await supabase.from('tarea_entregas')
    .select('id, url_archivo, notas, created_at').eq('tarea_id', id).order('created_at', { ascending: false })

  const est = estadoTarea(tarea.estado)
  const puedeEntregar = ['pendiente', 'en_progreso', 'rechazado'].includes(tarea.estado)

  return (
    <Pagina ancho="estrecho" titulo={tarea.titulo} volver={{ href: '/mi/servicio', texto: 'Mi servicio' }}
      subtitulo={<span className="inline-flex flex-wrap items-center gap-2">
        <Badge variant={est.variant}>{est.label}</Badge>
        {tarea.fecha_limite ? `Vence el ${formatDate(tarea.fecha_limite)}` : 'Sin fecha límite'}
      </span>}>

      {tarea.descripcion && (
        <Tarjeta titulo="Indicaciones">
          <p className="text-[15px] whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{tarea.descripcion}</p>
        </Tarjeta>
      )}

      {tarea.estado === 'rechazado' && (
        <div role="alert" className="rounded-2xl p-4 space-y-1" style={{ background: 'color-mix(in srgb, var(--destructive) 12%, transparent)' }}>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--destructive)' }}>Tu entrega necesita cambios</p>
          {tarea.feedback_rechazo && <p className="text-[15px]" style={{ color: 'var(--foreground)' }}>{tarea.feedback_rechazo}</p>}
        </div>
      )}

      {tarea.estado === 'entregado' && (
        <p role="status" className="text-[15px]" style={{ color: 'var(--muted)' }}>Entregaste tu trabajo. Un encargado lo revisará y te avisaremos.</p>
      )}

      {puedeEntregar && (
        <Tarjeta titulo={tarea.estado === 'rechazado' ? 'Entregar de nuevo' : 'Entregar'}>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Pega el enlace de tu archivo en Google Drive u OneDrive (con permiso para ver).</p>
          <EntregarTareaForm tareaId={tarea.id} />
        </Tarjeta>
      )}

      {!!entregas?.length && (
        <Grupo titulo="Mis entregas">
          {entregas.map((e, i) => (
            <Fila key={e.id} primero={i === 0} titulo={formatDate(e.created_at)} subtitulo={e.notas ?? undefined}
              detalle={<a href={e.url_archivo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[15px]" style={{ color: 'var(--accent)' }}>
                <LinkIcon size={14} aria-hidden="true" /> Abrir
              </a>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
