import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CheckCircle2, Circle, Video } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cursoDeSesion, estaInscrito, personaActual } from '@/lib/academia/servidor'
import ReproductorGrabacion from '@/components/academia/ReproductorGrabacion'
import ResumenForm from '@/components/academia/ResumenForm'
import Badge from '@/components/ui/Badge'
import { formatDate, hoyLima } from '@/lib/utils'

function Paso({ hecho, children }: { hecho: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
      {hecho
        ? <CheckCircle2 size={18} className="flex-shrink-0" style={{ color: 'var(--success)' }} aria-label="Hecho" />
        : <Circle size={18} className="flex-shrink-0" style={{ color: 'var(--muted)' }} aria-label="Pendiente" />}
      <span>{children}</span>
    </li>
  )
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
    <div className="space-y-5">
      <div>
        <Link href={`/taller/cursos/${tema.curso_id}`} className="text-sm hover:underline" style={{ color: 'var(--muted)' }}>{tema.curso.nombre}</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{tema.orden}. {tema.titulo}</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Clase del {formatDate(sesion.fecha)}
          {sesion.hora_inicio ? ` · ${String(sesion.hora_inicio).slice(0, 5)}` : ''}
          {sesion.hora_fin ? ` a ${String(sesion.hora_fin).slice(0, 5)}` : ''}
        </p>
        <div className="mt-2">
          {estado === 'presente' && <Badge variant="success">Asististe (1 punto)</Badge>}
          {estado === 'recuperada' && <Badge variant="info">Asistencia recuperada (0.5 puntos)</Badge>}
          {falto && <Badge variant="error">Faltaste (0 puntos)</Badge>}
        </div>
      </div>

      {sesion.enlace_reunion && sesion.fecha >= hoy && (
        <a href={sesion.enlace_reunion} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
          <Video size={18} aria-hidden="true" /> {sesion.fecha === hoy ? 'Unirse a la clase en vivo' : 'Enlace de la clase en vivo'}
        </a>
      )}

      {falto && (
        <section aria-labelledby="rec-t" className="p-4 rounded-2xl border space-y-2"
          style={{ borderColor: 'var(--warning)', background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))' }}>
          <h2 id="rec-t" className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>Recupera esta clase (0.5 puntos)</h2>
          <ol className="space-y-1.5">
            <Paso hecho={vio}>Mira la grabación completa.</Paso>
            <Paso hecho={!!resumen}>Envía tu resumen de lo que aprendiste.</Paso>
            <Paso hecho={resumen?.estado === 'aprobado'}>Espera a que un líder apruebe tu resumen.</Paso>
          </ol>
        </section>
      )}

      {sesion.grabacion_url ? (
        <section aria-labelledby="grab-t" className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 id="grab-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Grabación de la clase</h2>
          <ReproductorGrabacion sesionId={id} url={sesion.grabacion_url} porcentajeInicial={porcentaje} declarado={!!progreso?.visto_declarado} />
        </section>
      ) : sesion.fecha <= hoy ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>La grabación aún no está disponible.</p>
      ) : null}

      {sesion.fecha <= hoy && (
        <section aria-labelledby="res-t" className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between gap-2">
            <h2 id="res-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Mi resumen</h2>
            {resumen?.estado === 'pendiente' && <Badge variant="warning">En revisión</Badge>}
            {resumen?.estado === 'aprobado' && <Badge variant="success">Aprobado</Badge>}
            {resumen?.estado === 'rechazado' && <Badge variant="error">Necesita cambios</Badge>}
          </div>
          {resumen?.comentario && (
            <p className="text-sm p-3 rounded-lg" style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>
              <strong>Comentario del líder:</strong> {resumen.comentario}
            </p>
          )}
          {resumen?.estado === 'aprobado' || resumen?.estado === 'pendiente' ? (
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{resumen.texto}</p>
          ) : (
            <ResumenForm sesionId={id} inicial={resumen?.texto ?? ''} reenviar={!!resumen} />
          )}
        </section>
      )}
    </div>
  )
}
