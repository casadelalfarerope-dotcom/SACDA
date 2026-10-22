import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { editarSesion, marcarAsistencia } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import AccionBoton from '@/components/academia/AccionBoton'
import RevisarResumen from '@/components/academia/RevisarResumen'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { formatDate, hoyLima } from '@/lib/utils'

const ESTADO_ASIS = {
  presente: { label: 'Presente', variant: 'success' },
  recuperada: { label: 'Recuperada', variant: 'info' },
  ausente: { label: 'Ausente', variant: 'error' },
} as const

const ESTADO_RES = {
  pendiente: { label: 'Por revisar', variant: 'warning' },
  aprobado: { label: 'Aprobado', variant: 'success' },
  rechazado: { label: 'Con cambios pedidos', variant: 'error' },
} as const

export default async function SesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: sesion } = await supabase.from('sesiones')
    .select('*, tema:temas(id, titulo, orden, curso_id, curso:cursos(nombre))').eq('id', id).maybeSingle()
  if (!sesion) notFound()
  const tema = sesion.tema as unknown as { id: string; titulo: string; orden: number; curso_id: string; curso: { nombre: string } }

  const [{ data: inscritos }, { data: asistencias }, { data: resumenes }, { data: progresos }] = await Promise.all([
    supabase.from('curso_inscripciones')
      .select('persona_id, persona:personas!curso_inscripciones_persona_id_fkey(nombre_completo, foto_url)')
      .eq('curso_id', tema.curso_id).eq('activo', true),
    supabase.from('asistencias').select('persona_id, estado').eq('sesion_id', id),
    supabase.from('resumenes_clase').select('id, persona_id, texto, estado, comentario, updated_at').eq('sesion_id', id).order('updated_at'),
    supabase.from('grabacion_progreso').select('persona_id, segundos_vistos, duracion_seg, completado, visto_declarado').eq('sesion_id', id),
  ])

  const asis = new Map((asistencias ?? []).map((a) => [a.persona_id, a.estado as keyof typeof ESTADO_ASIS]))
  const prog = new Map((progresos ?? []).map((p) => [p.persona_id, p]))
  const nombres = new Map((inscritos ?? []).map((i) => [i.persona_id, (i.persona as unknown as { nombre_completo: string }).nombre_completo]))
  const yaPaso = sesion.fecha <= hoyLima()
  const alumnos = [...(inscritos ?? [])].sort((a, b) =>
    (nombres.get(a.persona_id) ?? '').localeCompare(nombres.get(b.persona_id) ?? ''))

  const tarjeta = 'p-5 rounded-2xl border space-y-4'
  const estiloTarjeta = { background: 'var(--surface)', borderColor: 'var(--border)' }

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto space-y-7">
      <div>
        <Link href={`/academia/temas/${tema.id}`} className="volver">
          {tema.curso.nombre} · Tema {tema.orden}: {tema.titulo}
        </Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Clase del {formatDate(sesion.fecha)}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-sm">
          {sesion.enlace_reunion && <a href={sesion.enlace_reunion} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Enlace de la reunión</a>}
          {sesion.grabacion_url && <a href={sesion.grabacion_url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--accent)' }}>Grabación</a>}
        </div>
      </div>

      <section aria-labelledby="asis-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="asis-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Asistencia</h2>
        {!yaPaso && <p className="text-xs" style={{ color: 'var(--muted)' }}>Esta clase aún no se dicta; puedes marcar la asistencia el mismo día.</p>}
        {!alumnos.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>No hay alumnos inscritos.</p>}
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {alumnos.map((i) => {
            const p = i.persona as unknown as { nombre_completo: string; foto_url: string | null }
            const estado = asis.get(i.persona_id)
            const pr = prog.get(i.persona_id)
            const visto = pr?.completado ? 'Vio la grabación completa'
              : pr?.visto_declarado ? 'Declaró haber visto la grabación'
              : pr?.duracion_seg ? `Vio ${Math.round((pr.segundos_vistos / pr.duracion_seg) * 100)}% de la grabación` : null
            return (
              <li key={i.persona_id} className="py-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--border)' }}>
                <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                <div className="flex-1 min-w-[10rem]">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{p.nombre_completo}</p>
                  {visto && <p className="text-xs" style={{ color: 'var(--muted)' }}>{visto}</p>}
                </div>
                {estado === 'recuperada' ? (
                  <Badge variant="info">Recuperada (0.5)</Badge>
                ) : (
                  <div className="flex gap-2" role="group" aria-label={`Asistencia de ${p.nombre_completo}`}>
                    <AccionBoton accion={marcarAsistencia.bind(null, id, i.persona_id, 'presente')}
                      variant={estado === 'presente' ? 'primary' : 'secondary'} ariaPressed={estado === 'presente'}>
                      Presente
                    </AccionBoton>
                    <AccionBoton accion={marcarAsistencia.bind(null, id, i.persona_id, 'ausente')}
                      variant={estado === 'ausente' ? 'destructive' : 'secondary'} ariaPressed={estado === 'ausente'}>
                      Ausente
                    </AccionBoton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Un alumno ausente pasa a <strong>Recuperada</strong> cuando ve la grabación y apruebas su resumen.
        </p>
      </section>

      <section aria-labelledby="res-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="res-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Resúmenes de los alumnos</h2>
        {!resumenes?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Ningún alumno ha enviado su resumen.</p>}
        <ul className="space-y-4">
          {resumenes?.map((r) => {
            const est = ESTADO_RES[r.estado as keyof typeof ESTADO_RES]
            const nombre = nombres.get(r.persona_id) ?? 'Alumno'
            return (
              <li key={r.id} className="p-4 rounded-xl border space-y-2" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{nombre}</p>
                  <Badge variant={est.variant}>{est.label}</Badge>
                </div>
                <p className="text-sm whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{r.texto}</p>
                {r.comentario && <p className="text-xs" style={{ color: 'var(--muted)' }}>Tu comentario: {r.comentario}</p>}
                {r.estado === 'pendiente' && <RevisarResumen resumenId={r.id} nombre={nombre} />}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-labelledby="edit-t" className={tarjeta} style={estiloTarjeta}>
        <h2 id="edit-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Datos de la clase</h2>
        <FormAccion accion={editarSesion.bind(null, id)} textoBoton="Guardar cambios">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input name="fecha" type="date" label="Fecha *" defaultValue={sesion.fecha} required />
            <Input name="hora_inicio" type="time" label="Hora de inicio" defaultValue={sesion.hora_inicio?.slice(0, 5) ?? ''} />
            <Input name="hora_fin" type="time" label="Hora de fin" defaultValue={sesion.hora_fin?.slice(0, 5) ?? ''} />
          </div>
          <Input name="enlace_reunion" type="url" label="Enlace de Zoom o Meet" defaultValue={sesion.enlace_reunion ?? ''} />
          <Input name="grabacion_url" type="url" label="Enlace de la grabación" defaultValue={sesion.grabacion_url ?? ''} />
        </FormAccion>
      </section>
    </div>
  )
}
