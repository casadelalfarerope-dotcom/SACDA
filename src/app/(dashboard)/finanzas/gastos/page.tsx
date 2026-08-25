import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Plus } from 'lucide-react'
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
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/finanzas"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Gastos</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Total: {fmt(total)}</p>
        </div>
        <Link href="/finanzas/gastos/nuevo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Registrar
        </Link>
      </div>

      {/* Resumen por categoría */}
      {Object.keys(porCategoria).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {Object.entries(porCategoria).map(([cat, monto]) => (
            <div key={cat} className="p-3 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: catColor[cat] ?? '#6366f1' }} />
                <span className="text-xs capitalize" style={{ color: 'var(--muted)' }}>{cat}</span>
              </div>
              <p className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{fmt(monto)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {['local','equipos','actividades','personal','servicios','otros'].map((c) => (
          <Link key={c} href={params.categoria === c ? '/finanzas/gastos' : `/finanzas/gastos?categoria=${c}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border capitalize"
            style={{
              background: params.categoria === c ? 'var(--accent)' : 'var(--surface)',
              borderColor: params.categoria === c ? 'var(--accent)' : 'var(--border)',
              color: params.categoria === c ? '#fff' : 'var(--foreground)',
            }}>
            {c}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {(gastos ?? []).map((g) => (
          <div key={g.id} className="flex items-center gap-4 p-4 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-2 self-stretch rounded-full" style={{ background: catColor[g.categoria] ?? '#6366f1' }} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{g.concepto}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {g.categoria} · {formatDate(g.fecha)}
                {g.descripcion ? ` · ${g.descripcion}` : ''}
              </p>
            </div>
            <p className="font-bold" style={{ color: 'var(--error)' }}>−{fmt(Number(g.monto))}</p>
          </div>
        ))}
        {(gastos ?? []).length === 0 && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Sin gastos registrados</p>
        )}
      </div>
    </div>
  )
}
