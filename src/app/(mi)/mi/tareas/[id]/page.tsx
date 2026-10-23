import { notFound } from 'next/navigation'
import { Link as LinkIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import EntregarTareaForm from '@/components/tareas/EntregarTareaForm'
import AprobarRechazarBtns from '@/components/tareas/AprobarRechazarBtns'
import { AsignarTareaForm } from '@/components/espacio/FormulariosLider'

export default async function MiTareaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await contextoEspacio()
  const supabase = await createClient()

  // La base de datos solo devuelve la tarea a su asignado, al líder de su ministerio o a un encargado.
  const { data: tarea } = await supabase.from('tareas')
    .select('id, tipo, titulo, descripcion, estado, fecha_limite, feedback_rechazo, asignado_id, asignado:personas!tareas_asignado_id_fkey(nombre_completo), grupo:grupos(id, nombre, encargado_id)')
    .eq('id', id).maybeSingle()
  if (!tarea) notFound()
  const grupo = tarea.grupo as unknown as { id: string; nombre: string; encargado_id: string | null } | null
  const esLider = grupo?.encargado_id === ctx.personaId
  const esMia = tarea.asignado_id === ctx.personaId
  if (!esLider && !esMia) notFound()

  const [{ data: entregas }, { data: miembros }] = await Promise.all([
    supabase.from('tarea_entregas').select('id, url_archivo, notas, created_at').eq('tarea_id', id).order('created_at', { ascending: false }),
    esLider && grupo
      ? supabase.from('grupo_miembros').select('persona_id, persona:personas(nombre_completo)').eq('grupo_id', grupo.id).eq('activo', true)
      : Promise.resolve({ data: [] as never[] }),
  ])
  const integrantes = (miembros ?? []).map((m) => ({ id: m.persona_id as string, nombre: (m.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '—' }))
  if (esLider && !integrantes.some((m) => m.id === ctx.personaId)) integrantes.push({ id: ctx.personaId, nombre: ctx.persona.nombre_completo })
  integrantes.sort((a, b) => a.nombre.localeCompare(b.nombre))

  const est = estadoTarea(tarea.estado)
  const puedeEntregar = esMia && ['pendiente', 'en_progreso', 'rechazado'].includes(tarea.estado)
  const volver = esLider && grupo ? { href: `/mi/ministerios/${grupo.id}`, texto: grupo.nombre } : { href: '/mi/ministerios', texto: 'Mis ministerios' }
  const asignado = (tarea.asignado as unknown as { nombre_completo: string } | null)?.nombre_completo

  return (
    <Pagina ancho="estrecho" titulo={tarea.titulo} volver={volver}
      subtitulo={<span className="inline-flex flex-wrap items-center gap-2">
        <Badge variant={est.variant}>{est.label}</Badge>
        {tarea.fecha_limite ? `Vence el ${formatDate(tarea.fecha_limite)}` : 'Sin fecha límite'}
        {esLider && ` · ${asignado ?? 'Sin asignar'}`}
      </span>}>

      {tarea.descripcion && (
        <Tarjeta titulo="Indicaciones">
          <p className="text-[15px] whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{tarea.descripcion}</p>
        </Tarjeta>
      )}

      {esLider && !tarea.asignado_id && (
        <Tarjeta titulo="Asignar">
          <AsignarTareaForm tareaId={tarea.id} integrantes={integrantes} />
        </Tarjeta>
      )}

      {esLider && tarea.estado === 'entregado' && (
        <Tarjeta titulo="Revisar la entrega">
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
            Abre la última entrega (abajo).{tarea.tipo === 'diseno' ? ' Si la apruebas, el arte se envía automáticamente a Multimedia e Impresiones.' : ''} Si necesita cambios, escribe qué corregir.
          </p>
          <AprobarRechazarBtns tareaId={tarea.id} />
        </Tarjeta>
      )}

      {tarea.estado === 'rechazado' && (
        <div role="alert" className="rounded-2xl p-4 space-y-1" style={{ background: 'color-mix(in srgb, var(--destructive) 12%, transparent)' }}>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--destructive)' }}>{esMia ? 'Tu entrega necesita cambios' : 'Se pidieron cambios'}</p>
          {tarea.feedback_rechazo && <p className="text-[15px]" style={{ color: 'var(--foreground)' }}>{tarea.feedback_rechazo}</p>}
        </div>
      )}

      {esMia && tarea.estado === 'entregado' && !esLider && (
        <p role="status" className="text-[15px]" style={{ color: 'var(--muted)' }}>Entregaste tu trabajo. El líder lo revisará y te avisaremos.</p>
      )}

      {puedeEntregar && (
        <Tarjeta titulo={tarea.estado === 'rechazado' ? 'Entregar de nuevo' : 'Entregar'}>
          <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Pega el enlace de tu archivo en Google Drive u OneDrive (con permiso para ver).</p>
          <EntregarTareaForm tareaId={tarea.id} />
        </Tarjeta>
      )}

      {!!entregas?.length && (
        <Grupo titulo="Entregas">
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
