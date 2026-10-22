import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, Trophy } from 'lucide-react'
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

function Seccion({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
  const id = `sec-${titulo.toLowerCase().replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id} className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="font-semibold" style={{ color: 'var(--foreground)' }}>{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  )
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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{curso.nombre}</h1>
        {curso.descripcion && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{curso.descripcion}</p>}
        {profesor && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Profesor: {profesor.nombre_completo}</p>}
        <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Estado del curso">
          {ESTADOS.map((e) => (
            <AccionBoton key={e.value} accion={cambiarEstadoCurso.bind(null, id, e.value)}
              variant={curso.estado === e.value ? 'primary' : 'secondary'} ariaPressed={curso.estado === e.value}>
              {e.label}
            </AccionBoton>
          ))}
        </div>
        {curso.estado === 'borrador' && (
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>Los alumnos no ven el curso hasta que esté Activo.</p>
        )}
      </div>

      {sesionesConPendientes.length > 0 && (
        <div className="p-4 rounded-2xl border" style={{ borderColor: 'var(--warning)', background: 'color-mix(in srgb, var(--warning) 8%, var(--surface))' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
            {pendientes!.length} resumen{pendientes!.length > 1 ? 'es' : ''} por revisar
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {sesionesConPendientes.map((sid, i) => (
              <Link key={sid} href={`/academia/sesiones/${sid}`} className="text-sm underline" style={{ color: 'var(--accent)' }}>
                Clase {i + 1}
              </Link>
            ))}
          </div>
        </div>
      )}

      <Seccion titulo="Temas">
        {!temas?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no hay temas.</p>}
        <ol className="space-y-2">
          {temas?.map((t) => (
            <li key={t.id}>
              <Link href={`/academia/temas/${t.id}`}
                className="flex items-center gap-3 p-3 rounded-xl border hover:opacity-80"
                style={{ borderColor: 'var(--border)' }}>
                <span className="w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>{t.orden}</span>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{t.titulo}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{(t.sesiones as unknown[]).length} sesiones</span>
                <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              </Link>
            </li>
          ))}
        </ol>
        <details className="pt-1">
          <summary className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ Agregar tema</summary>
          <div className="pt-3">
            <FormAccion accion={crearTema.bind(null, id)} textoBoton="Agregar tema" limpiar>
              <Input name="titulo" label="Título *" required />
              <Textarea name="resumen" label="Resumen de la clase" rows={3} />
            </FormAccion>
          </div>
        </details>
      </Seccion>

      <Seccion titulo="Exámenes">
        {!examenes?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no hay exámenes.</p>}
        <ul className="space-y-2">
          {examenes?.map((ex) => {
            const est = ESTADO_EXAMEN[ex.estado] ?? ESTADO_EXAMEN.borrador!
            return (
              <li key={ex.id}>
                <Link href={`/academia/examenes/${ex.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl border hover:opacity-80"
                  style={{ borderColor: 'var(--border)' }}>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--foreground)' }}>{ex.titulo}</span>
                  <Badge variant={est.variant}>{est.label}</Badge>
                  <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)' }} />
                </Link>
              </li>
            )
          })}
        </ul>
        <details className="pt-1">
          <summary className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ Crear examen</summary>
          <div className="pt-3">
            <FormAccion accion={crearExamen.bind(null, id)} textoBoton="Crear y agregar preguntas" irA="/academia/examenes/{id}">
              <Input name="titulo" label="Título *" required />
              <Select name="tema_id" label="Tema (opcional)" placeholder="Examen general del curso"
                options={(temas ?? []).map((t) => ({ value: t.id, label: `${t.orden}. ${t.titulo}` }))} />
            </FormAccion>
          </div>
        </details>
      </Seccion>

      <Seccion titulo={`Alumnos (${inscritosIds.size})`}>
        <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {inscripciones?.map((i) => {
            const p = i.persona as unknown as { nombre_completo: string; foto_url: string | null }
            return (
              <li key={i.persona_id} className="flex items-center gap-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="sm" />
                <span className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>{p.nombre_completo}</span>
                <AccionBoton accion={retirarAlumno.bind(null, id, i.persona_id)} variant="ghost"
                  confirmar={`¿Retirar a ${p.nombre_completo} del curso?`} ariaLabel={`Retirar a ${p.nombre_completo}`}>
                  Retirar
                </AccionBoton>
              </li>
            )
          })}
        </ul>
        <details>
          <summary className="text-sm font-medium cursor-pointer" style={{ color: 'var(--accent)' }}>+ Inscribir alumnos</summary>
          <div className="pt-3">
            <InscribirAlumnos cursoId={id} personas={(personas ?? []).filter((p) => !inscritosIds.has(p.id))} />
          </div>
        </details>
      </Seccion>

      <Seccion titulo="Ranking" accion={<Trophy size={18} aria-hidden="true" style={{ color: 'var(--warning)' }} />}>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          Promedio de exámenes (sobre 20). En empate, desempata la asistencia: presente 1, recuperada 0.5, falta 0.
          Solo los líderes ven esta tabla; cada alumno ve únicamente su puesto.
        </p>
        {ranking.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin alumnos inscritos.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs" style={{ color: 'var(--muted)' }}>
                  <th scope="col" className="px-2 py-2 font-medium">Puesto</th>
                  <th scope="col" className="px-2 py-2 font-medium">Alumno</th>
                  <th scope="col" className="px-2 py-2 font-medium text-right">Promedio</th>
                  <th scope="col" className="px-2 py-2 font-medium text-right">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((f) => (
                  <tr key={f.personaId} className="border-t" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                    <td className="px-2 py-2 font-semibold tabular-nums">{f.puesto}</td>
                    <td className="px-2 py-2">{f.nombre}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{f.promedio ?? '—'}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{f.asistencia} / {f.sesionesDictadas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>
    </div>
  )
}
