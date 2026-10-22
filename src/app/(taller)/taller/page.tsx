import Link from 'next/link'
import { CalendarClock, ChevronRight, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { calcularRanking, personaActual } from '@/lib/academia/servidor'
import PuestoRanking from '@/components/academia/PuestoRanking'
import { formatDate, hoyLima } from '@/lib/utils'

export default async function TallerInicioPage() {
  const yo = await personaActual()
  if (!yo) {
    return <p className="text-sm" style={{ color: 'var(--muted)' }}>Tu cuenta no está vinculada a una ficha. Contacta a un líder.</p>
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
      <div className="text-center py-16 space-y-2">
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>¡Bienvenido al Taller!</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no estás inscrito en ningún curso activo.</p>
      </div>
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Mi Taller</h1>

      {pendientes.length > 0 && (
        <section aria-labelledby="ex-pend" className="space-y-2">
          <h2 id="ex-pend" className="font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <ClipboardCheck size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} /> Exámenes por rendir
          </h2>
          {pendientes.map((e) => (
            <Link key={e.id} href={`/taller/examenes/${e.id}`} className="flex items-center gap-3 p-4 rounded-2xl border hover:opacity-80"
              style={{ background: 'var(--surface)', borderColor: 'var(--accent)' }}>
              <span className="flex-1">
                <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>{e.titulo}</span>
                <span className="block text-xs" style={{ color: 'var(--muted)' }}>Hasta el {formatDate(e.fecha_limite!, { time: true })}</span>
              </span>
              <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
            </Link>
          ))}
        </section>
      )}

      {!!proximas?.length && (
        <section aria-labelledby="prox" className="space-y-2">
          <h2 id="prox" className="font-semibold flex items-center gap-2" style={{ color: 'var(--foreground)' }}>
            <CalendarClock size={18} aria-hidden="true" style={{ color: 'var(--accent)' }} /> Próximas clases
          </h2>
          {proximas.map((s) => (
            <Link key={s.id} href={`/taller/sesiones/${s.id}`} className="flex items-center gap-3 p-4 rounded-2xl border hover:opacity-80"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span className="flex-1">
                <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>{tituloTema.get(s.tema_id)}</span>
                <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                  {formatDate(s.fecha)}{s.hora_inicio ? ` · ${String(s.hora_inicio).slice(0, 5)}` : ''}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
            </Link>
          ))}
        </section>
      )}

      <section aria-labelledby="mis-cursos" className="space-y-3">
        <h2 id="mis-cursos" className="font-semibold" style={{ color: 'var(--foreground)' }}>Mis cursos</h2>
        {cursos.map((c, i) => {
          const mia = rankings[i]!.find((f) => f.personaId === yo.personaId)
          return (
            <Link key={c.id} href={`/taller/cursos/${c.id}`} className="block p-4 rounded-2xl border hover:opacity-90 space-y-3"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <span className="flex-1 font-semibold" style={{ color: 'var(--foreground)' }}>{c.nombre}</span>
                <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              </div>
              {mia && <PuestoRanking puesto={mia.puesto} promedio={mia.promedio} />}
            </Link>
          )
        })}
      </section>
    </div>
  )
}
