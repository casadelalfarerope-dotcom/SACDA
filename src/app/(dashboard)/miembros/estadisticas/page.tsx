import { BarChart3 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hoyLima } from '@/lib/utils'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, Vacio } from '@/components/ui/ios'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const etiquetaMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`
const fechaCorta = (f: string) => `${Number(f.slice(8, 10))}/${Number(f.slice(5, 7))}`
const redondear = (n: number) => Math.round(n * 10) / 10

// Barras verticales simples (un solo color). Cada barra tiene su valor visible
// encima y una descripción completa para lectores de pantalla y al pasar el mouse.
function Barras({ datos, etiqueta }: { datos: { clave: string; etiqueta: string; valor: number; detalle: string }[]; etiqueta: string }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  return (
    <figure aria-label={etiqueta} className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-end gap-1.5 h-48 overflow-x-auto" role="list">
        {datos.map((d) => (
          <div key={d.clave} role="listitem" title={d.detalle} aria-label={d.detalle} className="flex-1 min-w-[26px] h-full flex flex-col items-center justify-end gap-1 group">
            <span className="text-[11px] font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{d.valor}</span>
            <span className="w-full max-w-[34px] rounded-t-[4px] transition-[filter] group-hover:brightness-110"
              style={{ height: `${Math.max(2, (d.valor / max) * 100)}%`, background: 'var(--accent)' }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5 border-t pt-1.5" style={{ borderColor: 'var(--border)' }} aria-hidden="true">
        {datos.map((d) => <span key={d.clave} className="flex-1 min-w-[26px] text-center text-[10.5px] truncate" style={{ color: 'var(--muted)' }}>{d.etiqueta}</span>)}
      </div>
    </figure>
  )
}

export default async function EstadisticasPage({ searchParams }: { searchParams: Promise<{ meses?: string }> }) {
  const { meses: mesesParam } = await searchParams
  const meses = ['3', '6', '12'].includes(mesesParam ?? '') ? Number(mesesParam) : 6
  const hoy = hoyLima()
  const inicio = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - meses, 1)).toISOString().slice(0, 10)

  const supabase = await createClient()
  const [{ data: asistencias }, { data: eventos }, { count: activos }] = await Promise.all([
    supabase.from('asistencia_culto').select('evento_id, fecha').gte('fecha', inicio).lte('fecha', hoy),
    supabase.from('eventos').select('id, titulo'),
    supabase.from('personas').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
  ])
  const titulo = new Map((eventos ?? []).map((e) => [e.id as string, e.titulo as string]))

  // Asistentes por culto (solo días en que se pasó lista).
  const porCulto = new Map<string, { evento_id: string; fecha: string; total: number }>()
  for (const a of asistencias ?? []) {
    const k = `${a.evento_id}|${a.fecha}`
    const c = porCulto.get(k) ?? { evento_id: a.evento_id, fecha: a.fecha, total: 0 }
    c.total++
    porCulto.set(k, c)
  }
  const cultos = [...porCulto.values()].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Promedio por mes.
  const porMes = new Map<string, { suma: number; cultos: number }>()
  for (let i = meses - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 - i, 1)).toISOString().slice(0, 7)
    porMes.set(m, { suma: 0, cultos: 0 })
  }
  for (const c of cultos) {
    const m = porMes.get(c.fecha.slice(0, 7))
    if (m) { m.suma += c.total; m.cultos++ }
  }
  const mesesDatos = [...porMes.entries()].map(([m, v]) => ({ mes: m, promedio: v.cultos ? redondear(v.suma / v.cultos) : 0, cultos: v.cultos }))
  const actual = mesesDatos.at(-1)!, anterior = mesesDatos.at(-2)
  const cambio = anterior?.promedio ? Math.round(((actual.promedio - anterior.promedio) / anterior.promedio) * 100) : null

  // Promedio por tipo de culto (Viernes, Domingo…).
  const porEvento = new Map<string, { suma: number; cultos: number }>()
  for (const c of cultos) {
    const v = porEvento.get(c.evento_id) ?? { suma: 0, cultos: 0 }
    v.suma += c.total; v.cultos++
    porEvento.set(c.evento_id, v)
  }
  const mejor = [...cultos].sort((a, b) => b.total - a.total)[0]
  const ultimos = cultos.slice(-16)

  const tarjeta = 'rounded-2xl border p-4'
  const estilo = { background: 'var(--surface)', borderColor: 'var(--border)' }

  return (
    <Pagina titulo="Estadísticas de asistencia" subtitulo="Cuántos hermanos vienen a los cultos y cómo cambia mes a mes"
      volver={{ href: '/miembros', texto: 'Seguimiento' }}>
      <SegmentadoEnlaces etiqueta="Periodo" actual={String(meses)}
        opciones={[3, 6, 12].map((n) => ({ valor: String(n), texto: `${n} meses`, href: `/miembros/estadisticas?meses=${n}` }))} />

      {!cultos.length ? (
        <Vacio icono={<BarChart3 size={44} />} titulo="Aún no hay asistencias registradas"
          texto="Cuando pasen lista en los cultos desde Seguimiento, aquí verás cuántos vinieron y cómo crece la asistencia." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={tarjeta} style={estilo}>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Promedio por culto en {MESES_LARGO[Number(actual.mes.slice(5, 7)) - 1]}</p>
              <p className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{actual.promedio}</p>
              {cambio !== null && (
                <p className="text-[13px] font-medium" style={{ color: cambio >= 0 ? 'var(--success)' : 'var(--destructive)' }}>
                  {cambio >= 0 ? '▲' : '▼'} {Math.abs(cambio)}% vs. mes anterior
                </p>
              )}
            </div>
            <div className={tarjeta} style={estilo}>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Cultos con lista</p>
              <p className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{cultos.length}</p>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>en {meses} meses</p>
            </div>
            <div className={tarjeta} style={estilo}>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Mayor asistencia</p>
              <p className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{mejor!.total}</p>
              <p className="text-[13px] truncate" style={{ color: 'var(--muted)' }}>{titulo.get(mejor!.evento_id)} · {fechaCorta(mejor!.fecha)}</p>
            </div>
            <div className={tarjeta} style={estilo}>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>Congregantes activos</p>
              <p className="text-[28px] font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{activos ?? 0}</p>
              <p className="text-[13px]" style={{ color: 'var(--muted)' }}>{activos ? `${Math.round((actual.promedio / activos) * 100)}% asiste en promedio` : ''}</p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Promedio por mes</h2>
            <Barras etiqueta="Promedio de asistentes por culto en cada mes" datos={mesesDatos.map((m) => ({
              clave: m.mes, etiqueta: etiquetaMes(m.mes), valor: m.promedio,
              detalle: `${MESES_LARGO[Number(m.mes.slice(5, 7)) - 1]} ${m.mes.slice(0, 4)}: ${m.promedio} en promedio (${m.cultos} ${m.cultos === 1 ? 'culto' : 'cultos'})`,
            }))} />
          </section>

          <section className="space-y-2">
            <h2 className="px-1 text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Asistentes en cada culto</h2>
            <Barras etiqueta="Asistentes en los últimos cultos" datos={ultimos.map((c) => ({
              clave: c.evento_id + c.fecha, etiqueta: fechaCorta(c.fecha), valor: c.total,
              detalle: `${titulo.get(c.evento_id) ?? 'Culto'} del ${fechaCorta(c.fecha)}: ${c.total} ${c.total === 1 ? 'asistente' : 'asistentes'}`,
            }))} />
          </section>

          <Grupo titulo="Promedio por culto">
            {[...porEvento.entries()].sort((a, b) => b[1].suma / b[1].cultos - a[1].suma / a[1].cultos).map(([id, v], i) => (
              <Fila key={id} primero={i === 0} titulo={titulo.get(id) ?? 'Evento eliminado'}
                subtitulo={`${v.cultos} ${v.cultos === 1 ? 'culto' : 'cultos'} con lista`}
                detalle={<span className="tabular-nums" style={{ color: 'var(--foreground)' }}>{redondear(v.suma / v.cultos)} en promedio</span>} />
            ))}
          </Grupo>

          <Grupo titulo="Detalle de cada culto">
            {[...cultos].reverse().map((c, i) => (
              <Fila key={c.evento_id + c.fecha} primero={i === 0} href={`/miembros?dia=${c.evento_id}|${c.fecha}`}
                titulo={titulo.get(c.evento_id) ?? 'Evento eliminado'} subtitulo={fechaCorta(c.fecha) + '/' + c.fecha.slice(0, 4)}
                detalle={<span className="tabular-nums" style={{ color: 'var(--foreground)' }}>{c.total} {c.total === 1 ? 'asistente' : 'asistentes'}</span>} />
            ))}
          </Grupo>
        </>
      )}
    </Pagina>
  )
}
