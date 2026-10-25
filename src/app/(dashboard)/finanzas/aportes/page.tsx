import { etiquetaTipoAporte, etiquetaMedio } from '@/lib/etiquetas'
import { createClient } from '@/lib/supabase/server'
import { Plus, Download } from 'lucide-react'
import { Pagina, Grupo, Fila, SegmentadoEnlaces, BotonEnlace, Vacio } from '@/components/ui/ios'
import { formatDate } from '@/lib/utils'

function fmt(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)
}

const tipoColor: Record<string, string> = {
  ofrenda: '#2563eb', diezmo: '#7c3aed', pacto: '#059669', otro: '#64748b',
}

export default async function AportesPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string; tipo?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('aportes')
    .select('*, personas(nombre_completo)')
    .order('fecha', { ascending: false })
    .limit(100)

  if (params.persona) query = query.eq('persona_id', params.persona)
  if (params.tipo) query = query.eq('tipo', params.tipo)

  const { data: aportes } = await query
  const total = (aportes ?? []).reduce((s, a) => s + Number(a.monto), 0)

  const porTipo: Record<string, number> = {}
  for (const a of aportes ?? []) {
    porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + Number(a.monto)
  }

  const TIPOS = ['ofrenda', 'diezmo', 'pacto', 'otro']
  return (
    <Pagina titulo="Aportes" subtitulo={`Total: ${fmt(total)}`} volver={{ href: '/finanzas', texto: 'Finanzas' }}
      acciones={<>
        <a href="/api/export/aportes" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full text-[14px] font-semibold"
          style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }}>
          <Download size={15} aria-hidden="true" /> Excel
        </a>
        <BotonEnlace href="/finanzas/aportes/nuevo" etiqueta="Registrar aporte"><Plus size={16} aria-hidden="true" /><span className="hidden sm:inline">Registrar</span></BotonEnlace>
      </>}>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(porTipo).map(([tipo, monto]) => (
          <div key={tipo} className="p-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--muted)' }}>
              <span className="w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: tipoColor[tipo] ?? '#8e8e93' }} />
              {etiquetaTipoAporte(tipo)}
            </span>
            <p className="text-[20px] font-bold tabular-nums mt-1" style={{ color: 'var(--foreground)' }}>{fmt(monto)}</p>
          </div>
        ))}
      </div>

      <SegmentadoEnlaces etiqueta="Filtrar por tipo" actual={params.tipo ?? ''}
        opciones={[{ valor: '', texto: 'Todos', href: '/finanzas/aportes' },
          ...TIPOS.map((t) => ({ valor: t, texto: etiquetaTipoAporte(t), href: `/finanzas/aportes?tipo=${t}` }))]} />

      {(aportes ?? []).length === 0 ? <Vacio titulo="Sin aportes" texto="Aún no hay registros con este filtro." /> : (
        <Grupo titulo="Últimos 100">
          {(aportes ?? []).map((a, i) => (
            <Fila key={a.id} primero={i === 0}
              inicio={<span className="block w-2.5 h-2.5 rounded-full" aria-hidden="true" style={{ background: tipoColor[a.tipo] ?? '#8e8e93' }} />}
              titulo={(a.personas as { nombre_completo: string } | null)?.nombre_completo ?? 'Anónimo'}
              subtitulo={`${etiquetaTipoAporte(a.tipo)} · ${etiquetaMedio(a.medio)} · ${formatDate(a.fecha)}${a.concepto ? ` · ${a.concepto}` : ''}`}
              detalle={<span className="font-semibold tabular-nums" style={{ color: 'var(--success)' }}>+{fmt(Number(a.monto))}</span>} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
