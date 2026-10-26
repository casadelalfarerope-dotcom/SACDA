import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, ClipboardCheck } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { contextoEspacio, misMinisterios } from '@/lib/espacio'
import { reuniones, integrantesDe } from '@/lib/agenda'
import { hoyLima } from '@/lib/utils'
import Badge from '@/components/ui/Badge'
import Avatar from '@/components/ui/Avatar'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila, Vacio, Tarjeta } from '@/components/ui/ios'
import { NuevoEventoMinisterio, AccionesReunion } from '@/components/agenda/FormulariosAgenda'

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const diaLargo = (f: string) => { const d = new Date(f + 'T12:00:00Z'); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}` }
const sumar = (f: string, n: number) => { const d = new Date(f + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const horario = (h: string | null, f: string | null) => h ? `${h.slice(0, 5)}${f ? `–${f.slice(0, 5)}` : ''}` : null

// Agenda del ministerio: próximas reuniones, pasar lista y resumen de asistencia.
export default async function AgendaMinisterioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await contextoEspacio()
  const mio = (await misMinisterios(ctx.personaId)).find((m) => m.id === id)
  if (!mio) notFound()

  const admin = createServiceClient()
  const hoy = hoyLima()
  const [proximas, pasadas] = await Promise.all([
    reuniones(admin, { grupoIds: [id] }, hoy, sumar(hoy, 60)),
    mio.gestiona ? reuniones(admin, { grupoIds: [id] }, sumar(hoy, -90), sumar(hoy, -1)) : Promise.resolve([]),
  ])

  // Resumen de asistencia (solo para quien gestiona): en las fechas con lista.
  let resumen: { id: string; nombre: string; foto: string | null; vino: number; total: number; seguidas: number }[] = []
  let conteo = new Map<string, number>()
  let conLista = new Set<string>()
  if (mio.gestiona) {
    const eventoIds = [...new Set([...pasadas, ...proximas].map((r) => r.evento_id))]
    const [{ data: listas }, { data: asistencias }, integrantes] = await Promise.all([
      eventoIds.length ? admin.from('asistencia_ministerio_listas').select('evento_id, fecha').in('evento_id', eventoIds) : Promise.resolve({ data: [] }),
      eventoIds.length ? admin.from('asistencia_ministerio').select('evento_id, fecha, persona_id').in('evento_id', eventoIds) : Promise.resolve({ data: [] }),
      integrantesDe(admin, id),
    ])
    const clave = (e: string, f: string) => `${e}|${f}`
    conLista = new Set((listas ?? []).map((l) => clave(l.evento_id, l.fecha)))
    conteo = new Map()
    const vinieron = new Set((asistencias ?? []).map((a) => `${clave(a.evento_id, a.fecha)}|${a.persona_id}`))
    for (const a of asistencias ?? []) conteo.set(clave(a.evento_id, a.fecha), (conteo.get(clave(a.evento_id, a.fecha)) ?? 0) + 1)
    // Reuniones con lista, de la más reciente a la más antigua.
    const conListaOrden = [...pasadas, ...proximas.filter((r) => r.fecha_real <= hoy)]
      .filter((r) => conLista.has(clave(r.evento_id, r.fecha)))
      .sort((a, b) => b.fecha_real.localeCompare(a.fecha_real))
    resumen = integrantes.map((p) => {
      const marcas = conListaOrden.map((r) => vinieron.has(`${clave(r.evento_id, r.fecha)}|${p.id}`))
      const seguidas = marcas.findIndex((v) => v)
      return { id: p.id, nombre: p.nombre_completo, foto: p.foto_url, vino: marcas.filter(Boolean).length, total: marcas.length, seguidas: seguidas === -1 ? marcas.length : seguidas }
    }).sort((a, b) => b.seguidas - a.seguidas || a.nombre.localeCompare(b.nombre))
  }
  const totalListas = resumen[0]?.total ?? 0
  const promedio = totalListas ? Math.round((resumen.reduce((s, r) => s + r.vino, 0) / totalListas) * 10) / 10 : 0

  // Eventos que ya tienen puestos propios (turnos).
  const { data: conPuestos } = mio.gestiona && proximas.length
    ? await admin.from('roles_servicio').select('evento_id').eq('activo', true).in('evento_id', [...new Set(proximas.map((r) => r.evento_id))])
    : { data: [] }
  const turnos = new Set((conPuestos ?? []).map((p) => p.evento_id as string))

  const enlaceLista = (eventoId: string, fecha: string) => `/mi/ministerios/${id}/agenda/${eventoId}/${fecha}`

  return (
    <Pagina ancho="estrecho" titulo="Agenda" subtitulo={`Reuniones y actividades de ${mio.nombre}`}
      volver={{ href: `/mi/ministerios/${id}`, texto: mio.nombre }}>
      <Grupo titulo="Próximas">
        {proximas.slice(0, 20).map((r, i) => {
          const esHoy = r.fecha_real === hoy
          return (
            <Fila key={r.evento_id + r.fecha} primero={i === 0}
              href={mio.gestiona && esHoy && r.requiere_asistencia ? enlaceLista(r.evento_id, r.fecha) : undefined}
              inicio={<IconoModulo icon={CalendarDays} color="#ff3b30" tamano={36} />}
              titulo={r.titulo}
              subtitulo={[diaLargo(r.fecha_real), horario(r.hora, r.hora_fin), r.lugar].filter(Boolean).join(' · ')}
              detalle={esHoy ? <Badge variant="warning">{mio.gestiona && r.requiere_asistencia ? 'Pasar lista' : 'Hoy'}</Badge> : undefined}>
              {mio.gestiona && (
                <span className="flex flex-wrap items-center gap-x-3">
                  <Link href={`/mi/ministerios/${id}/agenda/turnos/${r.evento_id}`} className="text-[13px] font-medium mt-1.5" style={{ color: 'var(--accent)' }}>
                    {turnos.has(r.evento_id) ? 'Turnos' : 'Agregar turnos'}
                  </Link>
                  {!esHoy && <AccionesReunion eventoId={r.evento_id} fecha={r.fecha} recurrente={r.recurrente} />}
                </span>
              )}
            </Fila>
          )
        })}
        {!proximas.length && <Fila primero titulo={<span style={{ color: 'var(--muted)' }}>No hay reuniones programadas</span>} />}
      </Grupo>

      {mio.gestiona && (
        <Tarjeta titulo="Nuevo evento del ministerio">
          <NuevoEventoMinisterio grupoId={id} hoy={hoy} />
        </Tarjeta>
      )}

      {mio.gestiona && pasadas.some((r) => r.requiere_asistencia) && (
        <Grupo titulo="Reuniones pasadas" pie="Puedes pasar lista hasta después de la reunión.">
          {[...pasadas].reverse().filter((r) => r.requiere_asistencia).slice(0, 10).map((r, i) => {
            const k = `${r.evento_id}|${r.fecha}`
            return (
              <Fila key={k} primero={i === 0} href={enlaceLista(r.evento_id, r.fecha)}
                inicio={<IconoModulo icon={ClipboardCheck} color={conLista.has(k) ? '#34c759' : '#8e8e93'} tamano={36} />}
                titulo={r.titulo} subtitulo={diaLargo(r.fecha_real)}
                detalle={conLista.has(k)
                  ? <span className="tabular-nums" style={{ color: 'var(--foreground)' }}>{conteo.get(k) ?? 0} vinieron</span>
                  : <Badge variant="muted">Sin lista</Badge>} />
            )
          })}
        </Grupo>
      )}

      {mio.gestiona && totalListas > 0 && (
        <Grupo titulo="Asistencia de los integrantes"
          pie={`Últimos 3 meses: ${totalListas} ${totalListas === 1 ? 'reunión' : 'reuniones'} con lista, ${promedio} en promedio por reunión. Solo tú lo ves; no genera avisos en Seguimiento.`}>
          {resumen.map((r, i) => (
            <Fila key={r.id} primero={i === 0} inicio={<Avatar nombre={r.nombre} fotoUrl={r.foto} size="sm" />}
              titulo={r.nombre} subtitulo={`Vino a ${r.vino} de ${r.total}`}
              detalle={r.seguidas >= 2
                ? <Badge variant={r.seguidas >= 3 ? 'error' : 'warning'}>Faltó {r.seguidas} seguidas</Badge>
                : r.seguidas === 1 ? <Badge variant="muted">Faltó la última</Badge> : undefined} />
          ))}
        </Grupo>
      )}

      {!mio.gestiona && !proximas.length && (
        <Vacio icono={<CalendarDays size={44} />} titulo="Sin reuniones por ahora" texto="Cuando el líder programe una reunión, te llegará un aviso y aparecerá aquí." />
      )}
    </Pagina>
  )
}
