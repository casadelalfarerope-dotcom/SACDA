import { ShoppingBag } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { estadoTarea } from '@/lib/etiquetas'
import { formatDate, hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Tarjeta } from '@/components/ui/ios'
import SolicitudVentaForm from '@/components/espacio/SolicitudVentaForm'

export default async function MisSolicitudesPage() {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const { data: solicitudes } = await supabase.from('tareas')
    .select('id, titulo, descripcion, estado, fecha_limite, feedback_rechazo')
    .eq('tipo', 'solicitud_venta').eq('solicitante_id', ctx.userId)
    .order('created_at', { ascending: false })

  return (
    <Pagina ancho="estrecho" titulo="Solicitudes" subtitulo="Pide permiso para vender algo al finalizar el culto">
      <Tarjeta titulo="Nueva solicitud">
        <SolicitudVentaForm hoy={hoyLima()} />
      </Tarjeta>

      {!!solicitudes?.length && (
        <Grupo titulo="Mis solicitudes">
          {solicitudes.map((s, i) => {
            const est = estadoTarea(s.estado === 'en_progreso' ? 'pendiente' : s.estado)
            return (
              <Fila key={s.id} primero={i === 0}
                inicio={<IconoModulo icon={ShoppingBag} color="#00c7be" tamano={36} />}
                titulo={s.titulo} subtitulo={s.fecha_limite ? `Para el ${formatDate(s.fecha_limite)}` : undefined}
                detalle={<Badge variant={est.variant}>{est.label}</Badge>}>
                {s.estado === 'rechazado' && s.feedback_rechazo && (
                  <span className="block text-[13px] mt-1 whitespace-normal" style={{ color: 'var(--muted)' }}>Motivo: {s.feedback_rechazo}</span>
                )}
              </Fila>
            )
          })}
        </Grupo>
      )}
    </Pagina>
  )
}
