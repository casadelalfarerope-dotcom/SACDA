import { notFound } from 'next/navigation'
import { CheckCircle2, Circle, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cursoDeSesion, estaInscrito, personaActual } from '@/lib/academia/servidor'
import ReproductorGrabacion from '@/components/academia/ReproductorGrabacion'
import ResumenForm from '@/components/academia/ResumenForm'
import Badge from '@/components/ui/Badge'
import { formatDate, hoyLima } from '@/lib/utils'
import { Pagina, Grupo, Fila, Tarjeta, Vacio } from '@/components/ui/ios'

function Paso({ hecho }: { hecho: boolean }) {
  return hecho
    ? <CheckCircle2 size={22} style={{ color: 'var(--success)' }} aria-label="Hecho" />
    : <Circle size={22} style={{ color: 'var(--muted)' }} aria-label="Pendiente" />
}

export default async function TallerSesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const yo = await personaActual()
  const admin = createServiceClient()
  const info = await cursoDeSesion(admin, id)
  if (!yo || !info?.cursoId || !(await estaInscrito(admin, info.cursoId, yo.personaId))) notFound()

  const supabase = await createClient()
  const [{ data: sesion }, { data: asistencia }, { data: resumen }, { data: progreso }] = await Promise.all([
    supabase.from('sesiones').select('*, tema:temas(titulo, orden, curso_id, curso:cursos(nombre))').eq('id', id).single(),
    supabase.from('asistencias').select('estado').eq('sesion_id', id).eq('persona_id', yo.personaId).maybeSingle(),
    supabase.from('resumenes_clase').select('texto, estado, comentario').eq('sesion_id', id).eq('persona_id', yo.personaId).maybeSingle(),
    supabase.from('grabacion_progreso').select('segundos_vistos, duracion_seg, completado, visto_declarado').eq('sesion_id', id).eq('persona_id', yo.personaId).maybeSingle(),
  ])
  if (!sesion) notFound()
  const tema = sesion.tema as unknown as { titulo: string; orden: number; curso_id: string; curso: { nombre: string } }
  const hoy = hoyLima()
  const porcentaje = progreso?.completado ? 100
    : progreso?.duracion_seg ? Math.min(100, Math.round((progreso.segundos_vistos / progreso.duracion_seg) * 100)) : 0
  const vio = !!progreso && (progreso.completado || progreso.visto_declarado)
  const estado = asistencia?.estado as 'presente' | 'ausente' | 'recuperada' | undefined
  const falto = estado === 'ausente' || (!estado && sesion.fecha < hoy)

  return (
    <Pagina ancho="estrecho" titulo={`${tema.orden}. ${tema.titulo}`}
      subtitulo={`Clase del ${formatDate(sesion.fecha)}${sesion.hora_inicio ? ` · ${String(sesion.hora_inicio).slice(0, 5)}` : ''}${sesion.hora_fin ? ` a ${String(sesion.hora_fin).slice(0, 5)}` : ''}`}
      volver={{ href: `/taller/cursos/${tema.curso_id}`, texto: tema.curso.nombre }}>

      {(estado === 'presente' || estado === 'recuperada' || falto) && (
        <div>
          {estado === 'presente' && <Badge variant="success">Asististe · 1 punto</Badge>}
          {estado === 'recuperada' && <Badge variant="info">Asistencia recuperada · 0.5 puntos</Badge>}
          {falto && <Badge variant="error">Faltaste · 0 puntos</Badge>}
        </div>
      )}

      {sesion.enlace_reunion && sesion.fecha >= hoy && (
        <a href={sesion.enlace_reunion} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full h-12 rounded-full text-[16px] font-semibold transition-[filter] hover:brightness-105"
          style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
          <Video size={19} aria-hidden="true" /> {sesion.fecha === hoy ? 'Unirse a la clase en vivo' : 'Enlace de la clase en vivo'}
        </a>
      )}

      {falto && (
        <Grupo titulo="Recupera esta clase · 0.5 puntos">
          <Fila primero inicio={<Paso hecho={vio} />} titulo="Mira la grabación completa" />
          <Fila inicio={<Paso hecho={!!resumen} />} titulo="Envía tu resumen de lo que aprendiste" />
          <Fila inicio={<Paso hecho={resumen?.estado === 'aprobado'} />} titulo="Espera a que un líder apruebe tu resumen" />
        </Grupo>
      )}

      {sesion.grabacion_url ? (
        <Tarjeta titulo="Grabación de la clase">
          <ReproductorGrabacion sesionId={id} url={sesion.grabacion_url} porcentajeInicial={porcentaje} declarado={!!progreso?.visto_declarado} />
        </Tarjeta>
      ) : sesion.fecha <= hoy ? (
        <Vacio titulo="La grabación aún no está disponible" />
      ) : null}

      {sesion.fecha <= hoy && (
        <Tarjeta titulo={<span className="flex items-center justify-between gap-2">
          Mi resumen
          {resumen?.estado === 'pendiente' && <Badge variant="warning">En revisión</Badge>}
          {resumen?.estado === 'aprobado' && <Badge variant="success">Aprobado</Badge>}
          {resumen?.estado === 'rechazado' && <Badge variant="error">Necesita cambios</Badge>}
        </span>}>
          {resumen?.comentario && (
            <p className="text-[15px] p-3 rounded-xl" style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>
              <strong>Comentario del líder:</strong> {resumen.comentario}
            </p>
          )}
          {resumen?.estado === 'aprobado' || resumen?.estado === 'pendiente' ? (
            <p className="text-[15px] whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{resumen.texto}</p>
          ) : (
            <ResumenForm sesionId={id} inicial={resumen?.texto ?? ''} reenviar={!!resumen} />
          )}
        </Tarjeta>
      )}
    </Pagina>
  )
}
