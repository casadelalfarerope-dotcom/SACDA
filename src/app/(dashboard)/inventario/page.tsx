import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, AlertTriangle, Package } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Badge from '@/components/ui/Badge'

const estadoVariant: Record<string, 'success' | 'warning' | 'error' | 'muted'> = {
  bueno: 'success', regular: 'warning', malo: 'error', baja: 'muted',
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]!
  const en30dias = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]!

  let query = supabase.from('bienes').select('*').order('nombre')
  if (params.estado) query = query.eq('estado', params.estado)

  const [{ data: bienes }, { data: proximos }] = await Promise.all([
    query,
    supabase.from('bienes')
      .select('id, nombre, proximo_mantenimiento')
      .lte('proximo_mantenimiento', en30dias)
      .gte('proximo_mantenimiento', hoy)
      .order('proximo_mantenimiento'),
  ])

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Inventario</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{(bienes ?? []).length} bienes registrados</p>
        </div>
        <Link href="/inventario/nuevo"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Agregar
        </Link>
      </div>

      {/* Alertas de mantenimiento */}
      {(proximos ?? []).length > 0 && (
        <div className="p-4 rounded-2xl border mb-6" style={{ background: '#fef9c3', borderColor: '#fde047' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} color="#ca8a04" />
            <p className="font-semibold text-sm" style={{ color: '#854d0e' }}>
              Mantenimientos en los próximos 30 días
            </p>
          </div>
          <ul className="space-y-1">
            {proximos!.map((b) => (
              <li key={b.id}>
                <Link href={`/inventario/${b.id}`} className="text-sm hover:underline" style={{ color: '#92400e' }}>
                  {b.nombre} — {formatDate(b.proximo_mantenimiento)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtros estado */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {['bueno','regular','malo','baja'].map((e) => (
          <Link key={e} href={params.estado === e ? '/inventario' : `/inventario?estado=${e}`}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border capitalize"
            style={{
              background: params.estado === e ? 'var(--accent)' : 'var(--surface)',
              borderColor: params.estado === e ? 'var(--accent)' : 'var(--border)',
              color: params.estado === e ? '#fff' : 'var(--foreground)',
            }}>
            {e === 'baja' ? 'de baja' : e}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {(bienes ?? []).map((b) => (
          <Link key={b.id} href={`/inventario/${b.id}`}
            className="flex items-center gap-4 p-4 rounded-2xl border transition-opacity hover:opacity-80"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--surface-secondary)' }}>
              <Package size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{b.nombre}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                {b.categoria ?? 'Sin categoría'}
                {b.numero_serie ? ` · ${b.numero_serie}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={estadoVariant[b.estado] ?? 'muted'}>{b.estado.replace('_', ' ')}</Badge>
              {b.proximo_mantenimiento && (
                <span className="text-xs" style={{ color: 'var(--muted)' }}>
                  Mant. {formatDate(b.proximo_mantenimiento)}
                </span>
              )}
            </div>
          </Link>
        ))}
        {(!bienes || bienes.length === 0) && (
          <p className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>Sin bienes registrados</p>
        )}
      </div>
    </div>
  )
}
