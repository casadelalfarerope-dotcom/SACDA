import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Calendar, User, Package, Link2 } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
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

  const asignado = (tarea.asignado as { nombre_completo: string } | null)?.nombre_completo
  return (
    <Pagina ancho="estrecho" titulo={tarea.titulo} subtitulo={tipoLabel[tarea.tipo] ?? tarea.tipo}
      volver={{ href: '/tareas', texto: 'Tareas' }}
      acciones={<Badge variant={estadoColor[tarea.estado] ?? 'default'}>{estadoLabel[tarea.estado] ?? tarea.estado}</Badge>}>

      {tarea.descripcion && (
        <Tarjeta><p className="text-[15px] leading-relaxed whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{tarea.descripcion}</p></Tarjeta>
      )}

      <Grupo titulo="Detalles">
        <Fila primero inicio={<IconoModulo icon={User} color="#ff9500" />} titulo="Asignado a" detalle={asignado ?? 'Sin asignar'} />
        <Fila inicio={<IconoModulo icon={Calendar} color="#ff3b30" />} titulo="Fecha límite"
          detalle={tarea.fecha_limite ? formatDate(tarea.fecha_limite) : 'Sin fecha'} />
      </Grupo>

      {tarea.feedback_rechazo && (
        <div className="p-4 rounded-2xl" style={{ background: 'color-mix(in srgb, var(--error) 10%, var(--surface))' }}>
          <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--error)' }}>Motivo del rechazo</p>
          <p className="text-[15px]" style={{ color: 'var(--foreground)' }}>{tarea.feedback_rechazo}</p>
        </div>
      )}

      {(entregas ?? []).length > 0 && (
        <Grupo titulo="Entregas">
          {(entregas ?? []).map((e, i) => (
            <Fila key={e.id} primero={i === 0} inicio={<IconoModulo icon={Link2} color="#a35d2d" />}
              subtitulo={[e.notas, formatDate(e.created_at)].filter(Boolean).join(' · ')}>
              <a href={e.url_archivo} target="_blank" rel="noopener noreferrer"
                className="block text-[15px] font-medium hover:underline break-all" style={{ color: 'var(--accent)' }}>
                {e.url_archivo}
              </a>
            </Fila>
          ))}
        </Grupo>
      )}

      {tieneDistribuciones && (
        <Grupo titulo="Distribución">
          {(distribuciones ?? []).map((d, i) => (
            <Fila key={d.id} primero={i === 0} inicio={<IconoModulo icon={Package} color="#5856d6" />}
              titulo={<span className="capitalize">{d.destino}</span>}
              detalle={d.confirmado
                ? <span className="font-medium" style={{ color: 'var(--success)' }}>Confirmado</span>
                : <ConfirmarDistribucionBtn id={d.id} tareaId={tarea.id} />} />
          ))}
        </Grupo>
      )}

      {puedeEntregar && (
        <Tarjeta titulo="Subir entrega">
          <EntregarTareaForm tareaId={tarea.id} />
        </Tarjeta>
      )}

      {puedeAprobar && <AprobarRechazarBtns tareaId={tarea.id} />}
    </Pagina>
  )
}
