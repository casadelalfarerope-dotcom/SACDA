import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Clock, MapPin, AlertCircle } from 'lucide-react'
import { generarInstancias } from '@/lib/calendario'
import Badge from '@/components/ui/Badge'

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

  const [{ data: eventos }, { data: excepciones }] = await Promise.all([
    supabase.from('eventos').select('*').or(
      `tipo_recurrencia.neq.ninguna,and(tipo_recurrencia.eq.ninguna,fecha_unica.gte.${desde.toISOString().split('T')[0]},fecha_unica.lte.${hasta.toISOString().split('T')[0]})`
    ),
    supabase.from('evento_excepciones').select('*')
      .gte('fecha_original', desde.toISOString().split('T')[0])
      .lte('fecha_original', hasta.toISOString().split('T')[0]),
  ])

  // Generar todas las instancias del mes
  const excepcionesPorEvento: Record<string, typeof excepciones> = {}
  for (const exc of excepciones ?? []) {
    if (!excepcionesPorEvento[exc.evento_id]) excepcionesPorEvento[exc.evento_id] = []
    excepcionesPorEvento[exc.evento_id]!.push(exc)
  }

  const todasInstancias = (eventos ?? []).flatMap((ev) =>
    generarInstancias(ev, excepcionesPorEvento[ev.id] ?? [], desde, hasta)
  ).sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

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

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/calendario?mes=${mesPrev}&anio=${anioPrev}`}
            className="p-2 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            ‹
          </Link>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>
            {MESES[mes]} {anio}
          </h1>
          <Link href={`/calendario?mes=${mesSig}&anio=${aniuoSig}`}
            className="p-2 rounded-xl border text-sm font-medium transition-opacity hover:opacity-70"
            style={{ borderColor: 'var(--border)', color: 'var(--foreground)', background: 'var(--surface)' }}>
            ›
          </Link>
        </div>
        <Link href="/calendario/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo evento</span>
        </Link>
      </div>

      {/* Cuadrícula del mes */}
      <div className="rounded-2xl border overflow-hidden mb-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center py-2 text-xs font-semibold"
              style={{ color: 'var(--muted)' }}>
              {d}
            </div>
          ))}
        </div>
        {/* Días */}
        <div className="grid grid-cols-7">
          {Array.from({ length: primerDia }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16 md:h-20 border-b border-r"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-secondary)' }} />
          ))}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1
            const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
            const instDia = porFecha[fechaStr] ?? []
            const esHoy = hoy.getDate() === dia && hoy.getMonth() === mes && hoy.getFullYear() === anio
            const col = (primerDia + i) % 7

            return (
              <div key={dia}
                className={`h-16 md:h-20 p-1 border-b text-xs overflow-hidden ${col < 6 ? 'border-r' : ''}`}
                style={{ borderColor: 'var(--border)' }}>
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-0.5 ${esHoy ? 'text-white' : ''}`}
                  style={esHoy ? { background: 'var(--accent)' } : { color: 'var(--foreground)' }}>
                  {dia}
                </span>
                {instDia.slice(0, 2).map((inst, idx) => (
                  <div key={idx}
                    className="truncate px-1 py-0.5 rounded text-xs mb-0.5"
                    style={{
                      background: inst.excepcion ? '#ff950020' : 'var(--accent)15',
                      color: inst.excepcion ? 'var(--warning)' : 'var(--accent)',
                    }}>
                    {inst.titulo}
                  </div>
                ))}
                {instDia.length > 2 && (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>+{instDia.length - 2}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Lista de eventos del mes */}
      <h2 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
        Eventos de {MESES[mes]}
      </h2>
      {todasInstancias.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Sin eventos para este mes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todasInstancias.map((inst, idx) => (
            <div key={idx}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {/* Fecha */}
              <div className="w-12 text-center flex-shrink-0">
                <p className="text-lg font-bold leading-none" style={{ color: 'var(--accent)' }}>
                  {inst.fecha.getDate()}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {DIAS_SEMANA[inst.fecha.getDay()]}
                </p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'var(--foreground)' }}>
                  {inst.titulo}
                </p>
                <div className="flex items-center gap-3 mt-0.5">
                  {inst.hora_inicio && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <Clock size={11} />
                      {inst.hora_inicio.slice(0, 5)}
                    </span>
                  )}
                  {inst.lugar && (
                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                      <MapPin size={11} />
                      {inst.lugar}
                    </span>
                  )}
                </div>
              </div>
              {inst.excepcion && (
                <AlertCircle size={16} style={{ color: 'var(--warning)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
