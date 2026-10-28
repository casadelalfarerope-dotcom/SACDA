import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays, Users, Mic2, Church, Cake } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { reuniones } from '@/lib/agenda'
import { misTurnos } from '@/lib/programas'
import { hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio } from '@/components/ui/ios'
import EnlaceReunion from '@/components/calendario/EnlaceReunion'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const INICIALES = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

type Tipo = 'iglesia' | 'ministerio' | 'turno' | 'cumple'
type Item = { tipo: Tipo; clave: string; titulo: string; detalle: string; hora: string | null; href?: string; enlace?: string | null }
const ESTILO: Record<Tipo, { color: string; icono: typeof Church; texto: string }> = {
  iglesia:    { color: '#a35d2d', icono: Church, texto: 'Iglesia' },
  ministerio: { color: '#ff3b30', icono: Users,  texto: 'Mi ministerio' },
  turno:      { color: '#ff2d55', icono: Mic2,   texto: 'Me toca servir' },
  cumple:     { color: '#e0559a', icono: Cake,   texto: 'Cumpleaños' },
}

// Calendario personal: actividades de la iglesia, reuniones de mis ministerios y mis turnos.
export default async function MiCalendarioPage({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  const ctx = await contextoEspacio()
  const hoy = hoyLima()
  const { mes: mesParam, dia: diaParam } = await searchParams
  const elegido = /^\d{4}-\d{2}-\d{2}$/.test(diaParam ?? '') ? diaParam! : null
  const [anio, mes] = (/^\d{4}-\d{2}$/.test(mesParam ?? '') ? mesParam! : elegido?.slice(0, 7) ?? hoy.slice(0, 7)).split('-').map(Number) as [number, number]
  const diasMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const primero = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimo = `${anio}-${String(mes).padStart(2, '0')}-${diasMes}`
  const mover = (d: number) => { const f = new Date(Date.UTC(anio, mes - 1 + d, 1)); return `${f.getUTCFullYear()}-${String(f.getUTCMonth() + 1).padStart(2, '0')}` }

  const admin = createServiceClient()
  const ministerios = await misMinisterios(ctx.personaId)
  const nombreMin = new Map(ministerios.map((m) => [m.id, m.nombre]))
  const [deIglesia, deMinisterios, turnos, { data: cumpleaneros }] = await Promise.all([
    reuniones(admin, 'iglesia', primero, ultimo),
    reuniones(admin, { grupoIds: ministerios.map((m) => m.id) }, primero, ultimo),
    misTurnos(admin, ctx.personaId),
    admin.from('personas').select('id, nombre_completo, fecha_nacimiento').eq('estado', 'activo').not('fecha_nacimiento', 'is', null),
  ])

  const porDia = new Map<string, Item[]>()
  const agregar = (f: string, it: Item) => { if (!porDia.has(f)) porDia.set(f, []); porDia.get(f)!.push(it) }
  for (const r of deIglesia) agregar(r.fecha_real, { tipo: 'iglesia', clave: r.evento_id + r.fecha, titulo: r.titulo, detalle: r.lugar ?? (r.modalidad === 'virtual' ? 'Virtual' : 'Toda la iglesia'), hora: r.hora?.slice(0, 5) ?? null, enlace: r.enlace })
  for (const r of deMinisterios) agregar(r.fecha_real, {
    tipo: 'ministerio', clave: r.evento_id + r.fecha, titulo: r.titulo,
    detalle: [nombreMin.get(r.grupo_id!), r.lugar].filter(Boolean).join(' · '), hora: r.hora?.slice(0, 5) ?? null,
    href: `/mi/ministerios/${r.grupo_id}/agenda`, enlace: r.enlace,
  })
  for (const t of turnos.filter((t) => t.programa.fecha >= primero && t.programa.fecha <= ultimo)) agregar(t.programa.fecha, {
    tipo: 'turno', clave: t.id, titulo: `${t.puesto.nombre} · ${t.grupo.nombre}`, detalle: t.programa.titulo,
    hora: t.programa.hora_inicio?.slice(0, 5) ?? null, href: `/mi/ministerios/${t.grupo.id}`,
  })
  // Cumpleaños de los hermanos: los ven todos, para saludarles ese día.
  const mm = String(mes).padStart(2, '0')
  for (const p of cumpleaneros ?? []) {
    const fn = p.fecha_nacimiento as string
    if (fn.slice(5, 7) !== mm) continue
    // 29 de febrero en año no bisiesto: se celebra el 28.
    const dd = fn.slice(8, 10) === '29' && mm === '02' && diasMes === 28 ? '28' : fn.slice(8, 10)
    const edad = anio - Number(fn.slice(0, 4))
    agregar(`${anio}-${mm}-${dd}`, { tipo: 'cumple', clave: p.id as string, titulo: p.id === ctx.personaId ? '¡Tu cumpleaños! 🎉' : `Cumpleaños de ${p.nombre_completo}`, detalle: edad > 0 ? `Cumple ${edad} años` : 'Salúdale ese día', hora: null })
  }
  for (const l of porDia.values()) l.sort((a, b) => (a.hora ?? '').localeCompare(b.hora ?? ''))

  const inicioSemana = new Date(Date.UTC(anio, mes - 1, 1)).getUTCDay()
  const celdas: (number | null)[] = [...Array(inicioSemana).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)]
  const fechaDe = (d: number) => `${anio}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  // Del mes actual se muestran solo los días que faltan; de otros meses, todos.
  const dias = [...porDia.keys()].sort().filter((f) => hoy.slice(0, 7) !== `${anio}-${String(mes).padStart(2, '0')}` || f >= hoy)

  return (
    <Pagina ancho="estrecho" titulo="Calendario" subtitulo="Toca un día para ver qué hay: cultos, tus turnos, tus ministerios y cumpleaños">
      <section aria-label={`${MESES[mes - 1]} ${anio}`} className="rounded-2xl border p-4 space-y-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <Link href={`/mi/calendario?mes=${mover(-1)}`} scroll={false} aria-label="Mes anterior" className="p-2 -m-1 rounded-full hover:bg-[color:var(--fill)]" style={{ color: 'var(--accent)' }}><ChevronLeft size={20} /></Link>
          <h2 className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>{MESES[mes - 1]} {anio}</h2>
          <Link href={`/mi/calendario?mes=${mover(1)}`} scroll={false} aria-label="Mes siguiente" className="p-2 -m-1 rounded-full hover:bg-[color:var(--fill)]" style={{ color: 'var(--accent)' }}><ChevronRight size={20} /></Link>
        </div>
        <div className="grid grid-cols-7 text-center gap-y-1">
          {INICIALES.map((d, i) => <span key={i} className="text-[12px] font-semibold" style={{ color: 'var(--muted)' }} aria-hidden="true">{d}</span>)}
          {celdas.map((d, i) => {
            if (!d) return <span key={i} />
            const f = fechaDe(d)
            const items = porDia.get(f) ?? []
            const esHoy = f === hoy
            const tipos = (['iglesia', 'ministerio', 'turno', 'cumple'] as Tipo[]).filter((t) => items.some((x) => x.tipo === t))
            return (
              <Link key={i} href={`/mi/calendario?mes=${anio}-${mm}&dia=${f}#detalle`} scroll={false}
                aria-label={`${d} de ${MESES[mes - 1]}${items.length ? `, ${items.length} ${items.length === 1 ? 'actividad' : 'actividades'}` : ''}`}
                aria-current={f === elegido ? 'date' : undefined}
                className="flex flex-col items-center gap-0.5 py-1 rounded-xl hover:bg-[color:var(--fill)]">
                <span className="w-8 h-8 flex items-center justify-center rounded-full text-[15px] tabular-nums"
                  style={{
                    background: esHoy ? 'var(--destructive)' : f === elegido ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : undefined,
                    color: esHoy ? '#fff' : f === elegido ? 'var(--accent)' : 'var(--foreground)', fontWeight: items.length || f === elegido ? 650 : 400,
                  }}>
                  {d}
                </span>
                <span className="flex gap-0.5 h-1.5" aria-hidden="true">
                  {tipos.map((t) => <span key={t} className="w-1.5 h-1.5 rounded-full" style={{ background: ESTILO[t].color }} />)}
                </span>
              </Link>
            )
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-[12px]" style={{ color: 'var(--muted)' }}>
          {(['iglesia', 'ministerio', 'turno', 'cumple'] as Tipo[]).map((t) => (
            <span key={t} className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: ESTILO[t].color }} /> {ESTILO[t].texto}</span>
          ))}
        </div>
      </section>

      {elegido && (() => {
        const d = new Date(`${elegido}T12:00:00Z`)
        const items = porDia.get(elegido) ?? []
        return (
          <section id="detalle" className="scroll-mt-20">
            <Grupo titulo={`${elegido === hoy ? 'Hoy · ' : ''}${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]!.toLowerCase()}`}
              pie={items.some((x) => x.tipo === 'turno') ? 'Ese día te toca servir. Revisa tu ministerio para ver el detalle.' : undefined}>
              {items.map((x, i) => {
                const E = ESTILO[x.tipo]
                return (
                  <Fila key={x.tipo + x.clave} primero={i === 0} href={x.enlace ? undefined : x.href}
                    inicio={<span id={x.tipo === 'cumple' ? `cumple-${x.clave}` : undefined}><IconoModulo icon={E.icono} color={E.color} tamano={36} /></span>}
                    titulo={x.titulo} subtitulo={[x.hora, x.detalle].filter(Boolean).join(' · ')}
                    detalle={x.tipo === 'turno' ? <Badge variant="warning">Sirves</Badge> : <span className="text-[12px]">{E.texto}</span>}>
                    {x.enlace && <EnlaceReunion href={x.enlace} />}
                  </Fila>
                )
              })}
              {!items.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No hay nada programado este día</span>} />}
            </Grupo>
          </section>
        )
      })()}

      {!dias.length && <Vacio icono={<CalendarDays size={44} />} titulo={`Nada más en ${MESES[mes - 1].toLowerCase()}`} texto="Revisa el mes siguiente con la flecha." />}

      {elegido && !!dias.length && <h2 className="px-4 pt-2 text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Todo el mes</h2>}
      {dias.map((f) => {
        const d = new Date(`${f}T12:00:00Z`)
        return (
          <Grupo key={f} titulo={`${f === hoy ? 'Hoy · ' : ''}${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]!.toLowerCase()}`}>
            {porDia.get(f)!.map((x, i) => {
              const E = ESTILO[x.tipo]
              return (
                <Fila key={x.tipo + x.clave} primero={i === 0} href={x.href}
                  inicio={<IconoModulo icon={E.icono} color={E.color} tamano={36} />}
                  titulo={x.titulo} subtitulo={[x.hora, x.detalle].filter(Boolean).join(' · ')}
                  detalle={x.tipo === 'turno' ? <Badge variant="warning">Sirves</Badge> : undefined} />
              )
            })}
          </Grupo>
        )
      })}
    </Pagina>
  )
}
