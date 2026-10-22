import { CalendarClock, ClipboardCheck, School } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calcularRanking, personaActual } from '@/lib/academia/servidor'
import PuestoRanking from '@/components/academia/PuestoRanking'
import { formatDate, hoyLima } from '@/lib/utils'

export default async function TallerInicioPage() {
  const yo = await personaActual()
  if (!yo) {
    return <Pagina ancho="estrecho" titulo="Mi Taller"><Vacio titulo="Cuenta sin ficha" texto="Tu cuenta no está vinculada a una ficha. Contacta a un líder." /></Pagina>
  }
  const supabase = await createClient()
  const { data: inscripciones } = await supabase.from('curso_inscripciones').select('curso_id')
    .eq('persona_id', yo.personaId).eq('activo', true)
  const misCursos = (inscripciones ?? []).map((i) => i.curso_id)
  const { data: cursos } = misCursos.length
    ? await supabase.from('cursos').select('id, nombre, descripcion').in('id', misCursos).neq('estado', 'borrador').order('nombre')
    : { data: [] as { id: string; nombre: string; descripcion: string | null }[] }

  if (!cursos?.length) {
    return (
      <Pagina ancho="estrecho" titulo="Mi Taller">
        <Vacio icono={<School size={44} />} titulo="¡Bienvenido al Taller!" texto="Aún no estás inscrito en ningún curso activo." />
      </Pagina>
    )
  }

  const admin = createServiceClient()
  const cursoIds = cursos.map((c) => c.id)
  const hoy = hoyLima()
  const [rankings, { data: temas }, { data: examenes }, { data: intentos }] = await Promise.all([
    Promise.all(cursos.map((c) => calcularRanking(admin, c.id))),
    supabase.from('temas').select('id, titulo, curso_id').in('curso_id', cursoIds),
    supabase.from('examenes').select('id, titulo, curso_id, fecha_limite').in('curso_id', cursoIds).eq('estado', 'publicado')
      .gt('fecha_limite', new Date().toISOString()).order('fecha_limite'),
    supabase.from('examen_intentos').select('examen_id, estado').eq('persona_id', yo.personaId),
  ])
  const temaIds = (temas ?? []).map((t) => t.id)
  const { data: proximas } = temaIds.length
    ? await supabase.from('sesiones').select('id, fecha, hora_inicio, tema_id').in('tema_id', temaIds).gte('fecha', hoy).order('fecha').limit(3)
    : { data: [] as { id: string; fecha: string; hora_inicio: string | null; tema_id: string }[] }
  const tituloTema = new Map((temas ?? []).map((t) => [t.id, t.titulo]))
  const rendidos = new Set((intentos ?? []).filter((i) => i.estado !== 'en_curso').map((i) => i.examen_id))
  const pendientes = (examenes ?? []).filter((e) => !rendidos.has(e.id))

  return (
    <Pagina ancho="estrecho" titulo="Mi Taller" subtitulo="El Taller del Alfarero">

      {pendientes.length > 0 && (
        <Grupo titulo="Exámenes por rendir">
          {pendientes.map((e, i) => (
            <Fila key={e.id} href={`/taller/examenes/${e.id}`} primero={i === 0}
              inicio={<IconoModulo icon={ClipboardCheck} color="#5856d6" />}
              titulo={e.titulo} subtitulo={`Hasta el ${formatDate(e.fecha_limite!, { time: true })}`} />
          ))}
        </Grupo>
      )}

      {!!proximas?.length && (
        <Grupo titulo="Próximas clases">
          {proximas.map((s, i) => (
            <Fila key={s.id} href={`/taller/sesiones/${s.id}`} primero={i === 0}
              inicio={<IconoModulo icon={CalendarClock} color="#ff3b30" />}
              titulo={tituloTema.get(s.tema_id)}
              subtitulo={`${formatDate(s.fecha)}${s.hora_inicio ? ` · ${String(s.hora_inicio).slice(0, 5)}` : ''}`} />
          ))}
        </Grupo>
      )}

      <Grupo titulo="Mis cursos">
        {cursos.map((c, i) => {
          const mia = rankings[i]!.find((f) => f.personaId === yo.personaId)
          return (
            <Fila key={c.id} href={`/taller/cursos/${c.id}`} primero={i === 0}
              inicio={<IconoModulo icon={School} color="#af52de" tamano={36} />}
              titulo={c.nombre}>
              {mia && <span className="block mt-2"><PuestoRanking puesto={mia.puesto} promedio={mia.promedio} /></span>}
            </Fila>
          )
        })}
      </Grupo>
    </Pagina>
  )
}
