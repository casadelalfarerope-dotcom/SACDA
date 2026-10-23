import Link from 'next/link'
import { ChevronLeft, ChevronRight, Video, ClipboardCheck, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { personaActual } from '@/lib/academia/servidor'
import { hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

type Item = { tipo: 'clase' | 'examen'; id: string; titulo: string; curso: string; hora: string | null; href: string; estado?: string }

// Fecha (YYYY-MM-DD) en hora de Lima de un instante ISO.
const fechaLima = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(iso))
const horaLima = (iso: string) => new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))

// Calendario del estudiante: sus clases y los plazos de sus exámenes.
export default async function CalendarioAcademiaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const yo = await personaActual()
  if (!yo) return <Pagina ancho="estrecho" titulo="Calendario"><Vacio titulo="Cuenta sin ficha" /></Pagina>

  const hoy = hoyLima()
  const { mes: mesParam } = await searchParams
  const [anio, mes] = (/^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : hoy.slice(0, 7)).split('-').map(Number) as [number, number]
  const primero = `${anio}-${String(mes).padStart(2, '0')}-01`
  const diasMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const ultimo = `${anio}-${String(mes).padStart(2, '0')}-${diasMes}`
  const mover = (d: number) => { const f = new Date(Date.UTC(anio, mes - 1 + d, 1)); return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}` }

  const supabase = await createClient()
  const { data: inscripciones } = await supabase.from('curso_inscripciones').select('curso_id').eq('persona_id', yo.personaId).eq('activo', true)
  const cursoIds = (inscripciones ?? []).map((i) => i.curso_id as string)
  const [{ data: cursos }, { data: temas }, { data: examenes }, { data: intentos }] = cursoIds.length
    ? await Promise.all([
      supabase.from('cursos').select('id, nombre').in('id', cursoIds).neq('estado', 'borrador'),
      supabase.from('temas').select('id, titulo, curso_id').in('curso_id', cursoIds),
      supabase.from('examenes').select('id, titulo, curso_id, fecha_limite').in('curso_id', cursoIds).eq('estado', 'publicado')
        .gte('fecha_limite', `${primero}T00:00:00-05:00`).lte('fecha_limite', `${ultimo}T23:59:59-05:00`),
      supabase.from('examen_intentos').select('examen_id, estado').eq('persona_id', yo.personaId),
    ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }] as const
  const temaIds = (temas ?? []).map((t) => t.id as string)
  const { data: sesiones } = temaIds.length
    ? await supabase.from('sesiones').select('id, fecha, hora_inicio, tema_id').in('tema_id', temaIds).gte('fecha', primero).lte('fecha', ultimo)
    : { data: [] as { id: string; fecha: string; hora_inicio: string | null; tema_id: string }[] }

  const nombreCurso = new Map((cursos ?? []).map((c) => [c.id as string, c.nombre as string]))
  const tema = new Map((temas ?? []).map((t) => [t.id as string, t as { id: string; titulo: string; curso_id: string }]))
  const rendidos = new Set((intentos ?? []).filter((i) => i.estado !== 'en_curso').map((i) => i.examen_id))

  const porDia = new Map<string, Item[]>()
  const agregar = (fecha: string, item: Item) => { if (!porDia.has(fecha)) porDia.set(fecha, []); porDia.get(fecha)!.push(item) }
  for (const s of sesiones ?? []) {
    const t = tema.get(s.tema_id)
    if (!t || !nombreCurso.has(t.curso_id)) continue
    agregar(s.fecha, { tipo: 'clase', id: s.id, titulo: t.titulo, curso: nombreCurso.get(t.curso_id)!, hora: s.hora_inicio?.slice(0, 5) ?? null, href: `/taller/sesiones/${s.id}` })
  }
  for (const e of examenes ?? []) {
    if (!nombreCurso.has(e.curso_id)) continue
    agregar(fechaLima(e.fecha_limite), { tipo: 'examen', id: e.id, titulo: e.titulo, curso: nombreCurso.get(e.curso_id)!, hora: horaLima(e.fecha_limite), href: `/taller/examenes/${e.id}`, estado: rendidos.has(e.id) ? 'rendido' : 'pendiente' })
  }
  for (const lista of porDia.values()) lista.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))

  const inicioSemana = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay()
  const celdas: (number | null)[] = [...Array(inicioSemana).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  const fechaDe = (d: number) => `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const dias = [...porDia.keys()].sort()

  return (
    <Pagina ancho="estrecho" titulo="Calendario" subtitulo="Tus clases y los plazos de tus exámenes">
      <section aria-label={`${MESES[mes - 1]} ${anio}`} className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <Link href={`/taller/calendario?mes=${mover(-1)}`} aria-label="Mes anterior" className="p-2 -m-1 rounded-full hover:bg-[color:var(--fill)]" style={{ color: 'var(--accent)' }}><ChevronLeft size={20} /></Link>
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>{MESES[mes - 1]} {anio}</h2>
          <Link href={`/taller/calendario?mes=${mover(1)}`} aria-label="Mes siguiente" className="p-2 -m-1 rounded-full hover:bg-[color:var(--fill)]" style={{ color: 'var(--accent)' }}><ChevronRight size={20} /></Link>
        </div>
        <div className="grid grid-cols-7 text-center gap-y-1">
          {INICIALES.map((d, i) => <span key={i} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }} aria-hidden="true">{d}</span>)}
          {celdas.map((d, i) => {
            if (!d) return <span key={i} />
            const f = fechaDe(d)
            const items = porDia.get(f) ?? []
            const esHoy = f === hoy
            return (
              <span key={i} className="flex flex-col items-center gap-0.5 py-1">
                <span className="w-8 h-8 flex items-center justify-center rounded-full text-[15px] tabular-nums"
                  style={{ background: esHoy ? 'var(--destructive)' : undefined, color: esHoy ? '#fff' : 'var(--foreground)', fontWeight: items.length ? 650 : 400 }}>
                  {d}
                </span>
                <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                  {items.some((x) => x.tipo === 'clase') && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#007aff' }} />}
                  {items.some((x) => x.tipo === 'examen') && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff9500' }} />}
                </span>
              </span>
            )
          })}
        </div>
        <div className="flex gap-4 justify-center text-[12px]" style={{ color: 'var(--muted)' }}>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#007aff' }} /> Clase</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: '#ff9500' }} /> Fin de plazo de examen</span>
        </div>
      </section>

      {!dias.length && <Vacio icono={<CalendarDays size={44} />} titulo={`Nada programado en ${MESES[mes - 1].toLowerCase()}`} texto="Cuando haya clases o exámenes de tus cursos, aparecerán aquí." />}

      {dias.map((f) => {
        const d = new Date(`${f}T12:00:00Z`)
        return (
          <Grupo key={f} titulo={`${f === hoy ? 'Hoy · ' : ''}${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]!.toLowerCase()}`}>
            {porDia.get(f)!.map((x, i) => (
              <Fila key={x.tipo + x.id} primero={i === 0} href={x.href}
                inicio={<IconoModulo icon={x.tipo === 'clase' ? Video : ClipboardCheck} color={x.tipo === 'clase' ? '#007aff' : '#ff9500'} tamano={36} />}
                titulo={x.titulo}
                subtitulo={`${x.curso} · ${x.tipo === 'clase' ? `Clase${x.hora ? ` a las ${x.hora}` : ''}` : `Plazo hasta las ${x.hora}`}`}
                detalle={x.tipo === 'examen' ? <Badge variant={x.estado === 'rendido' ? 'success' : f < hoy ? 'muted' : 'warning'}>{x.estado === 'rendido' ? 'Rendido' : f < hoy ? 'Venció' : 'Por rendir'}</Badge> : undefined} />
            ))}
          </Grupo>
        )
      })}
    </Pagina>
  )
}
