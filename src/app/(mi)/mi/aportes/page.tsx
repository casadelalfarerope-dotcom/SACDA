import { Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { contextoEspacio } from '@/lib/espacio'
import { etiquetaTipoAporte } from '@/lib/etiquetas'
import { formatDate, hoyLima } from '@/lib/utils'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, Vacio } from '@/components/ui/ios'

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default async function MisAportesPage({ searchParams }: { searchParams: Promise<{ anio?: string }> }) {
  const ctx = await contextoEspacio()
  const supabase = await createClient()
  const anioActual = Number(hoyLima().slice(0, 4))
  const { anio: anioParam } = await searchParams
  const anio = /^\d{4}$/.test(anioParam ?? '') ? Number(anioParam) : anioActual

  // RLS: cada persona solo puede leer sus propios aportes.
  const { data: aportes } = await supabase.from('aportes')
    .select('id, tipo, monto, fecha, concepto')
    .eq('persona_id', ctx.personaId).gte('fecha', `${anio}-01-01`).lte('fecha', `${anio}-12-31`)
    .order('fecha', { ascending: false })

  const lista = (aportes ?? []).map((a) => ({ ...a, monto: Number(a.monto) }))
  const total = lista.reduce((s, a) => s + a.monto, 0)
  const porTipo = Object.entries(lista.reduce<Record<string, number>>((acc, a) => {
    acc[a.tipo] = (acc[a.tipo] ?? 0) + a.monto
    return acc
  }, {})).sort((a, b) => b[1] - a[1])
  const porMes = lista.reduce<Record<number, typeof lista>>((acc, a) => {
    const m = Number(a.fecha.slice(5, 7)) - 1
    ;(acc[m] ??= []).push(a)
    return acc
  }, {})

  const anios = [anioActual, anioActual - 1, anioActual - 2]

  return (
    <Pagina ancho="estrecho" titulo="Mis aportes" subtitulo="Solo tú y tesorería pueden ver esta información">
      <SegmentadoEnlaces etiqueta="Año" actual={String(anio)}
        opciones={anios.map((a) => ({ valor: String(a), texto: String(a), href: `/mi/aportes?anio=${a}` }))} />

      <section aria-label={`Total ${anio}`} className="rounded-2xl border p-5" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="text-[13px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Total {anio}</p>
        <p className="text-[34px] font-bold tabular-nums mt-1" style={{ color: 'var(--foreground)' }}>{soles(total)}</p>
        {porTipo.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {porTipo.map(([tipo, monto]) => (
              <div key={tipo}>
                <dt className="text-[13px]" style={{ color: 'var(--muted)' }}>{etiquetaTipoAporte(tipo)}</dt>
                <dd className="text-[17px] font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>{soles(monto)}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {lista.length === 0 && <Vacio icono={<Wallet size={44} />} titulo={`Sin aportes registrados en ${anio}`} texto="Si crees que falta alguno, consulta con tesorería." />}

      {Object.keys(porMes).map(Number).sort((a, b) => b - a).map((m) => {
        const items = porMes[m]!
        const subtotal = items.reduce((s, a) => s + a.monto, 0)
        return (
          <Grupo key={m} titulo={MESES[m]} accion={<span className="text-[13px] tabular-nums" style={{ color: 'var(--muted)' }}>{soles(subtotal)}</span>}>
            {items.map((a, i) => (
              <Fila key={a.id} primero={i === 0} titulo={etiquetaTipoAporte(a.tipo)}
                subtitulo={[formatDate(a.fecha), a.concepto].filter(Boolean).join(' · ')}
                detalle={<span className="tabular-nums" style={{ color: 'var(--foreground)' }}>{soles(a.monto)}</span>} />
            ))}
          </Grupo>
        )
      })}
    </Pagina>
  )
}
