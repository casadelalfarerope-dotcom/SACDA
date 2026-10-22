import { notFound } from 'next/navigation'
import { ClipboardCheck, FileText } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calcularRanking } from '@/lib/academia/servidor'
import { cambiarEstadoCurso, crearExamen, crearTema, retirarAlumno } from '@/app/actions/academia'
import FormAccion from '@/components/academia/FormAccion'
import AccionBoton from '@/components/academia/AccionBoton'
import InscribirAlumnos from '@/components/academia/InscribirAlumnos'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'activo', label: 'Activo' },
  { value: 'finalizado', label: 'Finalizado' },
] as const

const ESTADO_EXAMEN: Record<string, { label: string; variant: 'muted' | 'success' | 'default' }> = {
  borrador: { label: 'Borrador', variant: 'muted' },
  publicado: { label: 'Publicado', variant: 'success' },
  cerrado: { label: 'Cerrado', variant: 'default' },
}

export default async function CursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: curso } = await supabase.from('cursos')
    .select('*, profesor:personas(nombre_completo)').eq('id', id).maybeSingle()
  if (!curso) notFound()

  const [{ data: temas }, { data: examenes }, { data: inscripciones }, { data: personas }, ranking] = await Promise.all([
    supabase.from('temas').select('id, orden, titulo, sesiones(id)').eq('curso_id', id).order('orden'),
    supabase.from('examenes').select('id, titulo, estado, fecha_limite').eq('curso_id', id).order('created_at'),
    supabase.from('curso_inscripciones')
      .select('persona_id, persona:personas!curso_inscripciones_persona_id_fkey(nombre_completo, foto_url)')
      .eq('curso_id', id).eq('activo', true),
    supabase.from('personas').select('id, nombre_completo, dni').eq('estado', 'activo').order('nombre_completo'),
    calcularRanking(createServiceClient(), id),
  ])

  const temaIds = (temas ?? []).map((t) => t.id)
  const { data: sesiones } = temaIds.length
    ? await supabase.from('sesiones').select('id').in('tema_id', temaIds)
    : { data: [] as { id: string }[] }
  const sesionIds = (sesiones ?? []).map((s) => s.id)
  const { data: pendientes } = sesionIds.length
    ? await supabase.from('resumenes_clase').select('sesion_id').in('sesion_id', sesionIds).eq('estado', 'pendiente')
    : { data: [] as { sesion_id: string }[] }

  const inscritosIds = new Set((inscripciones ?? []).map((i) => i.persona_id))
  const profesor = curso.profesor as unknown as { nombre_completo: string } | null
  const sesionesConPendientes = [...new Set((pendientes ?? []).map((p) => p.sesion_id))]

  const Agregar = ({ texto, children }: { texto: string; children: React.ReactNode }) => (
    <details className="rounded-2xl border px-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <summary className="py-3 text-[15px] font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ {texto}</summary>
      <div className="pb-4">{children}</div>
    </details>
  )

  return (
    <Pagina titulo={curso.nombre} subtitulo={[profesor && `Profesor: ${profesor.nombre_completo}`, curso.descripcion].filter(Boolean).join(' · ')}
      volver={{ href: '/academia', texto: 'Academia' }}>

      <div className="space-y-2">
        <SegmentadoAcciones>
          {ESTADOS.map((e) => (
            <AccionBoton key={e.value} accion={cambiarEstadoCurso.bind(null, id, e.value)}
              variant={curso.estado === e.value ? 'primary' : 'ghost'} ariaPressed={curso.estado === e.value}>
              {e.label}
            </AccionBoton>
          ))}
        </SegmentadoAcciones>
        {curso.estado === 'borrador' && (
          <p className="text-[13px] px-1" style={{ color: 'var(--muted)' }}>Los alumnos no ven el curso hasta que esté Activo.</p>
        )}
      </div>

      {sesionesConPendientes.length > 0 && (
        <Grupo titulo="Por revisar">
          {sesionesConPendientes.map((sid, i) => (
            <Fila key={sid} href={`/academia/sesiones/${sid}`} primero={i === 0}
              inicio={<IconoModulo icon={FileText} color="#ff9500" />}
              titulo={`Resúmenes de la clase ${i + 1}`}
              detalle={<Badge variant="warning">{(pendientes ?? []).filter((p) => p.sesion_id === sid).length}</Badge>} />
          ))}
        </Grupo>
      )}

      <div className="space-y-2">
        <Grupo titulo="Temas">
          {(temas ?? []).map((t, i) => (
            <Fila key={t.id} href={`/academia/temas/${t.id}`} primero={i === 0}
              inicio={<span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: 'var(--fill)', color: 'var(--foreground)' }}>{t.orden}</span>}
              titulo={t.titulo} detalle={`${(t.sesiones as unknown[]).length} clases`} />
          ))}
          {!temas?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Aún no hay temas</span>} />}
        </Grupo>
        <Agregar texto="Agregar tema">
          <FormAccion accion={crearTema.bind(null, id)} textoBoton="Agregar tema" limpiar>
            <Input name="titulo" label="Título *" required />
            <Textarea name="resumen" label="Resumen de la clase" rows={3} />
          </FormAccion>
        </Agregar>
      </div>

      <div className="space-y-2">
        <Grupo titulo="Exámenes">
          {(examenes ?? []).map((ex, i) => {
            const est = ESTADO_EXAMEN[ex.estado] ?? ESTADO_EXAMEN.borrador!
            return (
              <Fila key={ex.id} href={`/academia/examenes/${ex.id}`} primero={i === 0}
                inicio={<IconoModulo icon={ClipboardCheck} color="#5856d6" />}
                titulo={ex.titulo} detalle={<Badge variant={est.variant}>{est.label}</Badge>} />
            )
          })}
          {!examenes?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Aún no hay exámenes</span>} />}
        </Grupo>
        <Agregar texto="Crear examen">
          <FormAccion accion={crearExamen.bind(null, id)} textoBoton="Crear y agregar preguntas" irA="/academia/examenes/{id}">
            <Input name="titulo" label="Título *" required />
            <Select name="tema_id" label="Tema (opcional)" placeholder="Examen general del curso"
              options={(temas ?? []).map((t) => ({ value: t.id, label: `${t.orden}. ${t.titulo}` }))} />
          </FormAccion>
        </Agregar>
      </div>

      <div className="space-y-2">
        <Grupo titulo={`Alumnos (${inscritosIds.size})`}>
          {(inscripciones ?? []).map((ins, i) => {
            const p = ins.persona as unknown as { nombre_completo: string; foto_url: string | null }
            return (
              <Fila key={ins.persona_id} primero={i === 0}
                inicio={<Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />}
                titulo={p.nombre_completo}
                detalle={<AccionBoton accion={retirarAlumno.bind(null, id, ins.persona_id)} variant="ghost"
                  confirmar={`¿Retirar a ${p.nombre_completo} del curso?`} ariaLabel={`Retirar a ${p.nombre_completo}`}>
                  Retirar
                </AccionBoton>} />
            )
          })}
          {!inscripciones?.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin alumnos inscritos</span>} />}
        </Grupo>
        <Agregar texto="Inscribir alumnos">
          <InscribirAlumnos cursoId={id} personas={(personas ?? []).filter((p) => !inscritosIds.has(p.id))} />
        </Agregar>
      </div>

      <Grupo titulo="Ranking"
        pie="Promedio de exámenes sobre 20. En empate desempata la asistencia (presente 1, recuperada 0.5, falta 0). Cada alumno solo ve su propio puesto.">
        {ranking.map((f, i) => (
          <Fila key={f.personaId} primero={i === 0}
            inicio={<span className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold tabular-nums"
              style={f.puesto <= 3 && f.promedio != null
                ? { background: ['#ffd60a', '#d1d1d6', '#d4a373'][f.puesto - 1], color: '#1d1d1f' }
                : { background: 'var(--fill)', color: 'var(--foreground)' }}>{f.puesto}</span>}
            titulo={f.nombre}
            subtitulo={`Asistencia ${f.asistencia} de ${f.sesionesDictadas}`}
            detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{f.promedio ?? '—'}</span>} />
        ))}
        {!ranking.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin alumnos inscritos</span>} />}
      </Grupo>
    </Pagina>
  )
}

function SegmentadoAcciones({ children }: { children: React.ReactNode }) {
  return (
    <div role="group" aria-label="Estado del curso" className="inline-flex p-0.5 rounded-full gap-0.5" style={{ background: 'var(--fill)' }}>
      {children}
    </div>
  )
}
