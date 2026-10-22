import { CATEGORIAS_GASTO, etiquetaCategoriaGasto } from '@/lib/etiquetas'
import { createClient } from '@/lib/supabase/server'
import { Plus, Download } from 'lucide-react'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'
import { formatDate } from '@/lib/utils'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}

const catColor: Record<string, string> = {
  local: '#2563eb', equipos: '#7c3aed', actividades: '#059669',
  personal: '#d97706', servicios: '#0891b2', otros: '#64748b',
}

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('gastos')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(100)

  if (params.categoria) query = query.eq('categoria', params.categoria)

  const { data: gastos } = await query
  const total = (gastos ?? []).reduce((s, g) => s + Number(g.monto), 0)

  const porCategoria: Record<string, number> = {}
  for (const g of gastos ?? []) {
    porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + Number(g.monto)
  }

  return (
    <Pagina titulo="Gastos" subtitulo={`Total: ${fmt(total)}`} volver={{ href: '/finanzas', texto: 'Finanzas' }}
      acciones={<>
        <a href="/api/export/gastos" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
          <Download size={15} aria-hidden="true" /> Excel
        </a>
        <BotonEnlace href="/finanzas/gastos/nuevo" etiqueta="Registrar gasto"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Registrar</span></BotonEnlace>
      </>}>

      <SegmentadoEnlaces etiqueta="Filtrar por categoría" actual={params.categoria ?? ''}
        opciones={[{ valor: '', texto: 'Todas', href: '/finanzas/gastos' },
          ...CATEGORIAS_GASTO.map((c) => ({ valor: c.value, texto: c.label, href: `/finanzas/gastos?categoria=${c.value}` }))]} />

      {Object.keys(porCategoria).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(porCategoria).map(([cat, monto]) => (
            <div key={cat} className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
                <span className="w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: catColor[cat] ?? '#8e8e93' }} />
                {etiquetaCategoriaGasto(cat)}
              </span>
              <p className="text-[20px] font-bold tabular-nums mt-1" style={{ color: 'var(--foreground)' }}>{fmt(monto)}</p>
            </div>
          ))}
        </div>
      )}

      {(gastos ?? []).length === 0 ? <Vacio titulo="Sin gastos" texto="Aún no hay registros con este filtro." /> : (
        <Grupo titulo="Últimos 100">
          {(gastos ?? []).map((g, i) => (
            <Fila key={g.id} primero={i === 0}
              inicio={<span className="block w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: catColor[g.categoria] ?? '#8e8e93' }} />}
              titulo={g.concepto}
              subtitulo={`${etiquetaCategoriaGasto(g.categoria)} · ${formatDate(g.fecha)}`}
              detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--foreground)' }}>−{fmt(Number(g.monto))}</span>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
