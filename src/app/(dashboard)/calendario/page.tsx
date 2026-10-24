import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { Pagina, Grupo, Fila, BotonEnlace, Vacio } from '@/components/ui/ios'
import { generarInstancias } from '@/lib/calendario'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const DIAS_SEMANA = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; anio?: string }>
}) {
  const params = await searchParams
  const hoy = new Date()
  const mes = parseInt(params.mes ?? String(hoy.getMonth()))
  const anio = parseInt(params.anio ?? String(hoy.getFullYear()))

  const desde = new Date(anio, mes, 1)
  const hasta = new Date(anio, mes + 1, 0)

  const supabase = await createClient()

  const [{ data: eventos }, { data: excepciones }, { data: programas }] = await Promise.all([
    supabase.from('eventos').select('*').or(
      `tipo_recurrencia.neq.ninguna,and(tipo_recurrencia.eq.ninguna,fecha_unica.gte.${desde.toISOString().split('T')[0]},fecha_unica.lte.${hasta.toISOString().split('T')[0]})`
    ),
    supabase.from('evento_excepciones').select('*')
      .gte('fecha_original', desde.toISOString().split('T')[0])
      .lte('fecha_original', hasta.toISOString().split('T')[0]),
    // Programas de servidores de los cultos de este mes (con lo que ya publicó cada ministerio).
    supabase.from('programas').select('id, evento_id, fecha_original, programa_ministerios(estado)')
      .not('evento_id', 'is', null).eq('cancelado', false),
  ])
  const programaDe = new Map((programas ?? []).map((p) => [`${p.evento_id}|${p.fecha_original}`, {
    id: p.id as string,
    publicados: ((p.programa_ministerios ?? []) as { estado: string }[]).filter((m) => m.estado === 'publicado').length,
  }]))

  // Generar todas las instancias del mes
  const excepcionesPorEvento: Record<string, typeof excepciones> = {}
  for (const exc of excepciones ?? []) {
    if (!excepcionesPorEvento[exc.evento_id]) excepcionesPorEvento[exc.evento_id] = []
    excepcionesPorEvento[exc.evento_id]!.push(exc)
  }

  // Los días cancelados también se muestran (tachados) para poder deshacer el cambio.
  const cancelados = (excepciones ?? []).filter((x) => x.tipo_excepcion === 'cancelado').flatMap((x) => {
    const ev = (eventos ?? []).find((e) => e.id === x.evento_id)
    return ev ? [{ fecha: new Date(x.fecha_original + 'T12:00:00'), titulo: ev.titulo, hora_inicio: ev.hora_inicio, lugar: ev.lugar, evento_id: ev.id, fecha_original: x.fecha_original as string, excepcion: 'cancelado' }] : []
  })
  const tipoExcepcion = new Map((excepciones ?? []).map((x) => [`${x.evento_id}|${x.fecha_original}`, x.tipo_excepcion as string]))
  const todasInstancias = [...(eventos ?? []).flatMap((ev) =>
    generarInstancias(ev, excepcionesPorEvento[ev.id] ?? [], desde, hasta)
  ), ...cancelados].sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Agrupar por fecha
  const porFecha: Record<string, typeof todasInstancias> = {}
  for (const inst of todasInstancias) {
    const key = inst.fecha.toISOString().split('T')[0]
    if (!porFecha[key]) porFecha[key] = []
    porFecha[key]!.push(inst)
  }

  // Navegación entre meses
  const mesPrev = mes === 0 ? 11 : mes - 1
  const anioPrev = mes === 0 ? anio - 1 : anio
  const mesSig = mes === 11 ? 0 : mes + 1
  const aniuoSig = mes === 11 ? anio + 1 : anio

  // Construir cuadrícula del calendario
  const primerDia = new Date(anio, mes, 1).getDay()
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()

  const DIAS_LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const fechasConEventos = Object.keys(porFecha).sort()
  const navBtn = 'w-9 h-9 flex items-center justify-center rounded-full transition-[filter] hover:brightness-95'
  const navEstilo = { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }

  return (
    <Pagina titulo={<>{MESES[mes]} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{anio}</span></>}
      acciones={<>
        <Link href={`/calendario?mes=${mesPrev}&anio=${anioPrev}`} aria-label="Mes anterior" className={navBtn} style={navEstilo}>
          <ChevronLeft size={18} aria-hidden="true" />
        </Link>
        <Link href="/calendario" className="h-9 px-3.5 inline-flex items-center rounded-full text-[14px] font-semibold" style={navEstilo}>Hoy</Link>
        <Link href={`/calendario?mes=${mesSig}&anio=${aniuoSig}`} aria-label="Mes siguiente" className={navBtn} style={navEstilo}>
          <ChevronRight size={18} aria-hidden="true" />
        </Link>
        <BotonEnlace href="/calendario/nuevo" etiqueta="Nuevo evento"><Plus size={17} aria-hidden="true" /></BotonEnlace>
      </>}>

      <section aria-label={`Calendario de ${MESES[mes]} ${anio}`} className="rounded-2xl border p-3 md:p-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-7 mb-1" aria-hidden="true">
          {DIAS_LETRA.map((d, i) => (
            <div key={i} className="text-center text-[12px] font-semibold py-1" style={{ color: 'var(--muted)' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: primerDia }).map((_, i) => <div key={`v-${i}`} aria-hidden="true" />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1
            const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
            const instDia = porFecha[fechaStr] ?? []
            const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
            const finDeSemana = (primerDia + i) % 7 === 0 || (primerDia + i) % 7 === 6
            return (
              <div key={dia} className="flex flex-col items-center min-h-[52px] md:min-h-[76px] px-0.5"
                aria-label={`${dia} de ${MESES[mes]}${instDia.length ? `, ${instDia.length} evento${instDia.length > 1 ? 's' : ''}` : ''}`}>
                <span className="w-8 h-8 flex items-center justify-center rounded-full text-[15px] tabular-nums"
                  style={esHoy
                    ? { background: '#ff3b30', color: '#fff', fontWeight: 700 }
                    : { color: finDeSemana ? 'var(--muted)' : 'var(--foreground)', fontWeight: 500 }}>
                  {dia}
                </span>
                {instDia.length > 0 && (
                  <span className="flex md:hidden gap-0.5 mt-1" aria-hidden="true">
                    {instDia.slice(0, 3).map((inst, k) => (
                      <span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: inst.excepcion ? 'var(--warning)' : 'var(--muted)' }} />
                    ))}
                  </span>
                )}
                <span className="hidden md:block w-full mt-0.5 space-y-0.5">
                  {instDia.slice(0, 2).map((inst, k) => (
                    <span key={k} className="block truncate px-1.5 py-px rounded-md text-[11px] font-medium"
                      style={{
                        background: inst.excepcion ? 'color-mix(in srgb, var(--warning) 16%, transparent)' : 'color-mix(in srgb, var(--accent) 12%, transparent)',
                        color: inst.excepcion ? 'var(--warning)' : 'var(--accent)',
                      }}>
                      {inst.titulo}
                    </span>
                  ))}
                  {instDia.length > 2 && <span className="block text-[11px] px-1.5" style={{ color: 'var(--muted)' }}>+{instDia.length - 2} más</span>}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {fechasConEventos.length === 0 ? (
        <Vacio titulo="Sin eventos este mes" texto="Crea un evento con el botón +." />
      ) : (
        <div className="space-y-5">
          {fechasConEventos.map((f) => {
            const d = new Date(`${f}T12:00:00`)
            return (
              <Grupo key={f} titulo={`${DIAS_SEMANA[d.getDay()]} ${d.getDate()} de ${MESES[mes]}`}>
                {porFecha[f]!.map((inst, k) => {
                  const programa = programaDe.get(`${inst.evento_id}|${inst.fecha_original}`)
                  const cambio = tipoExcepcion.get(`${inst.evento_id}|${inst.fecha_original}`)
                  const cancelado = cambio === 'cancelado'
                  return (
                  <Fila key={k} primero={k === 0} href={`/calendario/evento/${inst.evento_id}?fecha=${inst.fecha_original}`}
                    inicio={<span className="block w-1 h-9 rounded-full" aria-hidden="true"
                      style={{ background: cancelado ? 'var(--muted)' : cambio ? 'var(--warning)' : 'var(--accent)' }} />}
                    titulo={cancelado ? <span className="line-through" style={{ color: 'var(--muted)' }}>{inst.titulo}</span> : inst.titulo}
                    subtitulo={cancelado ? 'Cancelado este día' : [inst.lugar,
                      cambio === 'reprogramado' ? (inst.fecha_original !== inst.fecha.toISOString().slice(0, 10) ? `Movido desde el ${inst.fecha_original.slice(8, 10)}/${inst.fecha_original.slice(5, 7)}` : 'Hora cambiada') : cambio === 'modificado' ? 'Con cambios' : null,
                      programa && (programa.publicados ? `Servidores: ${programa.publicados} ${programa.publicados === 1 ? 'ministerio publicó' : 'ministerios publicaron'}` : 'Servidores sin publicar')]
                      .filter(Boolean).join(' · ') || undefined}
                    detalle={inst.hora_inicio ? <span className="tabular-nums">{inst.hora_inicio.slice(0, 5)}</span> : 'Todo el día'} />
                  )
                })}
              </Grupo>
            )
          })}
        </div>
      )}
    </Pagina>
  )
}
