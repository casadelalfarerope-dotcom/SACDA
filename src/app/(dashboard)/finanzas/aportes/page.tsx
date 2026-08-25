import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Plus, Download } from 'lucide-react'
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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/finanzas"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Aportes</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Total: {fmt(total)}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/export/aportes"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
            <Download size={14} /> Excel
          </a>
          <Link href="/finanzas/aportes/nuevo"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--accent)' }}>
            <Plus size={15} /> Registrar
          </Link>
        </div>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Object.entries(porTipo).map(([tipo, monto]) => (
          <div key={tipo} className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: tipoColor[tipo] ?? '#6366f1' }} />
              <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{tipo}</span>
            </div>
            <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{fmt(monto)}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {['ofrenda','diezmo','pacto','otro'].map((t) => (
          <Link key={t} href={params.tipo === t ? '/finanzas/aportes' : `/finanzas/aportes?tipo=${t}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border capitalize"
            style={{
              background: params.tipo === t ? 'var(--accent)' : 'var(--surface)',
              borderColor: params.tipo === t ? 'var(--accent)' : 'var(--border)',
              color: params.tipo === t ? '#fff' : 'var(--foreground)',
            }}>
            {t}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {(aportes ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-4 p-4 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-2 self-stretch rounded-full" style={{ background: tipoColor[a.tipo] ?? '#6366f1' }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                {(a.personas as any)?.nombre_completo ?? '—'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {a.tipo} · {formatDate(a.fecha)}
                {a.concepto ? ` · ${a.concepto}` : ''}
              </p>
            </div>
            <p className="font-bold" style={{ color: '#16a34a' }}>{fmt(Number(a.monto))}</p>
          </div>
        ))}
        {(aportes ?? []).length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Sin registros</p>
        )}
      </div>
    </div>
  )
}
