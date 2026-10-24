import { notFound } from 'next/navigation'
import { FileText, ClipboardCheck, BookOpen, CalendarDays } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calcularRanking, estaInscrito, personaActual } from '@/lib/academia/servidor'
import { mejorNota, type IntentoResumen } from '@/lib/academia/reglas'
import PuestoRanking from '@/components/academia/PuestoRanking'
import Badge from '@/components/ui/Badge'
import { formatDate, hoyLima } from '@/lib/utils'

const ASIS = {
  presente: { label: 'Asististe', variant: 'success' },
  recuperada: { label: 'Recuperada', variant: 'info' },
  ausente: { label: 'Faltaste', variant: 'error' },
} as const

export default async function TallerCursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const yo = await personaActual()
  const admin = createServiceClient()
  if (!yo || !(await estaInscrito(admin, id, yo.personaId))) notFound()

  const supabase = await createClient()
  const { data: curso } = await supabase.from('cursos').select('id, nombre, descripcion').eq('id', id).neq('estado', 'borrador').maybeSingle()
  if (!curso) notFound()

  const [{ data: temas }, { data: examenes }, ranking] = await Promise.all([
    supabase.from('temas').select('id, orden, titulo, resumen, sesiones(id, fecha, hora_inicio), materiales(id, titulo, url)')
      .eq('curso_id', id).order('orden'),
    supabase.from('examenes').select('id, titulo, estado, fecha_limite').eq('curso_id', id).neq('estado', 'borrador').order('publicado_en'),
    calcularRanking(admin, id),
  ])
  const sesionIds = (temas ?? []).flatMap((t) => (t.sesiones as { id: string }[]).map((s) => s.id))
  const examIds = (examenes ?? []).map((e) => e.id)
  const [{ data: asistencias }, { data: intentos }] = await Promise.all([
    sesionIds.length ? supabase.from('asistencias').select('sesion_id, estado').in('sesion_id', sesionIds).eq('persona_id', yo.personaId)
      : Promise.resolve({ data: [] as { sesion_id: string; estado: keyof typeof ASIS }[] }),
    examIds.length ? supabase.from('examen_intentos').select('examen_id, numero, tipo, estado, nota').in('examen_id', examIds).eq('persona_id', yo.personaId)
      : Promise.resolve({ data: [] as (IntentoResumen & { examen_id: string })[] }),
  ])
  const asis = new Map((asistencias ?? []).map((a) => [a.sesion_id, a.estado as keyof typeof ASIS]))
  const mia = ranking.find((f) => f.personaId === yo.personaId)
  const hoy = hoyLima()

  return (
    <Pagina ancho="estrecho" titulo={curso.nombre} subtitulo={curso.descripcion ?? undefined} volver={{ href: '/taller', texto: 'Academia' }}>
      {mia && <PuestoRanking puesto={mia.puesto} promedio={mia.promedio} />}

      {!!examenes?.length && (
        <Grupo titulo="Exámenes">
          {examenes.map((e, i) => {
            const propios = (intentos ?? []).filter((x) => x.examen_id === e.id) as IntentoResumen[]
            const nota = mejorNota(propios)
            const abierto = e.estado === 'publicado' && e.fecha_limite && new Date(e.fecha_limite) > new Date()
            return (
              <Fila key={e.id} href={`/taller/examenes/${e.id}`} primero={i === 0}
                inicio={<IconoModulo icon={ClipboardCheck} color="#5856d6" />}
                titulo={e.titulo}
                subtitulo={abierto ? `Abierto hasta el ${formatDate(e.fecha_limite!, { time: true })}` : 'Cerrado'}
                detalle={nota != null ? <Badge variant="success">{nota}/20</Badge> : abierto ? <Badge variant="warning">Pendiente</Badge> : <Badge variant="muted">Sin nota</Badge>} />
            )
          })}
        </Grupo>
      )}

      {!temas?.length && <Vacio titulo="Aún no hay temas" texto="Tu profesor todavía no publica los temas del curso." />}
      {temas?.map((t) => {
        const sesiones = [...(t.sesiones as { id: string; fecha: string; hora_inicio: string | null }[])].sort((a, b) => a.fecha.localeCompare(b.fecha))
        const materiales = t.materiales as { id: string; titulo: string; url: string }[]
        let n = 0
        return (
          <Grupo key={t.id} titulo={`${t.orden}. ${t.titulo}`}>
            {t.resumen && (
              <Fila primero={n++ === 0} inicio={<IconoModulo icon={BookOpen} color="#af52de" />}>
                <details>
                  <summary className="text-[15px] cursor-pointer" style={{ color: 'var(--foreground)' }}>Resumen del tema</summary>
                  <p className="text-[15px] mt-2 whitespace-pre-line" style={{ color: 'var(--muted)' }}>{t.resumen}</p>
                </details>
              </Fila>
            )}
            {materiales.map((m) => (
              <Fila key={m.id} primero={n++ === 0} inicio={<IconoModulo icon={FileText} color="#a35d2d" />}>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="block text-[15px] font-medium truncate" style={{ color: 'var(--accent)' }}>{m.titulo}</a>
              </Fila>
            ))}
            {sesiones.map((s) => {
              const estado = asis.get(s.id) ?? null
              const proxima = s.fecha >= hoy
              return (
                <Fila key={s.id} href={`/taller/sesiones/${s.id}`} primero={n++ === 0}
                  inicio={<IconoModulo icon={CalendarDays} color="#ff3b30" />}
                  titulo={`Clase del ${formatDate(s.fecha)}`}
                  subtitulo={s.hora_inicio ? String(s.hora_inicio).slice(0, 5) : undefined}
                  detalle={estado ? <Badge variant={ASIS[estado].variant}>{ASIS[estado].label}</Badge>
                    : proxima ? <Badge variant="default">Próxima</Badge> : undefined} />
              )
            })}
            {n === 0 && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>Sin clases programadas</span>} />}
          </Grupo>
        )
      })}
    </Pagina>
  )
}
