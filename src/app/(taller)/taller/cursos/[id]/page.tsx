import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, FileText } from 'lucide-react'
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
    <div className="space-y-6">
      <div>
        <Link href="/taller" className="volver">Mi Taller</Link>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>{curso.nombre}</h1>
        {curso.descripcion && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{curso.descripcion}</p>}
      </div>

      {mia && <PuestoRanking puesto={mia.puesto} promedio={mia.promedio} />}

      {!!examenes?.length && (
        <section aria-labelledby="ex-t" className="space-y-2">
          <h2 id="ex-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Exámenes</h2>
          {examenes.map((e) => {
            const propios = (intentos ?? []).filter((i) => i.examen_id === e.id) as IntentoResumen[]
            const nota = mejorNota(propios)
            const abierto = e.estado === 'publicado' && e.fecha_limite && new Date(e.fecha_limite) > new Date()
            return (
              <Link key={e.id} href={`/taller/examenes/${e.id}`} className="flex items-center gap-3 p-4 rounded-2xl border hover:opacity-80"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <span className="flex-1">
                  <span className="block text-sm font-medium" style={{ color: 'var(--foreground)' }}>{e.titulo}</span>
                  <span className="block text-xs" style={{ color: 'var(--muted)' }}>
                    {abierto ? `Abierto hasta el ${formatDate(e.fecha_limite!, { time: true })}` : 'Cerrado'}
                  </span>
                </span>
                {nota != null ? <Badge variant="success">{nota}/20</Badge> : abierto ? <Badge variant="warning">Pendiente</Badge> : <Badge variant="muted">Sin nota</Badge>}
                <ChevronRight size={18} aria-hidden="true" style={{ color: 'var(--muted)' }} />
              </Link>
            )
          })}
        </section>
      )}

      <section aria-labelledby="temas-t" className="space-y-3">
        <h2 id="temas-t" className="font-semibold" style={{ color: 'var(--foreground)' }}>Temas</h2>
        {!temas?.length && <p className="text-sm" style={{ color: 'var(--muted)' }}>Aún no hay temas publicados.</p>}
        {temas?.map((t) => {
          const sesiones = [...(t.sesiones as { id: string; fecha: string; hora_inicio: string | null }[])].sort((a, b) => a.fecha.localeCompare(b.fecha))
          const materiales = t.materiales as { id: string; titulo: string; url: string }[]
          return (
            <article key={t.id} className="p-4 rounded-2xl border space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--foreground)' }}>{t.orden}. {t.titulo}</h3>
              {t.resumen && (
                <details>
                  <summary className="text-sm cursor-pointer" style={{ color: 'var(--accent)' }}>Ver resumen del tema</summary>
                  <p className="text-sm mt-2 whitespace-pre-line" style={{ color: 'var(--foreground)' }}>{t.resumen}</p>
                </details>
              )}
              {!!materiales.length && (
                <ul className="space-y-1">
                  {materiales.map((m) => (
                    <li key={m.id}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm hover:underline" style={{ color: 'var(--accent)' }}>
                        <FileText size={14} aria-hidden="true" /> {m.titulo}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="space-y-2">
                {sesiones.map((s) => {
                  const estado = asis.get(s.id) ?? null
                  const proxima = s.fecha >= hoy
                  return (
                    <li key={s.id}>
                      <Link href={`/taller/sesiones/${s.id}`} className="flex items-center gap-3 p-3 rounded-xl border hover:opacity-80"
                        style={{ borderColor: 'var(--border)' }}>
                        <span className="flex-1 text-sm" style={{ color: 'var(--foreground)' }}>
                          Clase del {formatDate(s.fecha)}{s.hora_inicio ? ` · ${String(s.hora_inicio).slice(0, 5)}` : ''}
                        </span>
                        {estado ? <Badge variant={ASIS[estado].variant}>{ASIS[estado].label}</Badge>
                          : proxima ? <Badge variant="default">Próxima</Badge> : null}
                        <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--muted)' }} />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </section>
    </div>
  )
}
