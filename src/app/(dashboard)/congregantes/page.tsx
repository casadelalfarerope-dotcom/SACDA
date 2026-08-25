import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { calcularEdad } from '@/lib/utils'
import type { EstadoPersona } from '@/types/database'

const estadoLabel: Record<EstadoPersona, { label: string; variant: 'success' | 'muted' | 'warning' }> = {
  activo:   { label: 'Activo',  variant: 'success' },
  inactivo: { label: 'Inactivo', variant: 'muted' },
  visita:   { label: 'Visita',  variant: 'warning' },
}

const MINISTERIOS = [
  'Alabanza', 'Jóvenes', 'Niños', 'Intercesión', 'Multimedia',
  'Diseño Gráfico', 'Limpieza', 'Academia', 'Coordinación', 'Impresiones',
]

export default async function CongregantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; ministerio?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('personas')
    .select('*')
    .order('nombre_completo')

  if (params.q) {
    query = query.or(`nombre_completo.ilike.%${params.q}%,dni.ilike.%${params.q}%`)
  }
  if (params.estado) {
    query = query.eq('estado', params.estado as EstadoPersona)
  }
  if (params.ministerio) {
    query = query.eq('ministerio', params.ministerio)
  }

  const { data: personas } = await query.limit(200)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Congregantes
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {personas?.length ?? 0} registros
          </p>
        </div>
        <Link
          href="/congregantes/nuevo"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}>
          <Plus size={16} />
          <span className="hidden sm:inline">Nuevo</span>
        </Link>
      </div>

      {/* Filtros */}
      <form className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--muted)' }} />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
        </div>
        <select
          name="estado"
          defaultValue={params.estado ?? ''}
          className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
          <option value="visita">Visita</option>
        </select>
        <select
          name="ministerio"
          defaultValue={params.ministerio ?? ''}
          className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
          <option value="">Todos los ministerios</option>
          {MINISTERIOS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button type="submit"
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: 'var(--accent)' }}>
          Filtrar
        </button>
      </form>

      {/* Lista */}
      {!personas || personas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <p className="text-lg font-medium mb-1">Sin resultados</p>
          <p className="text-sm">Ajusta los filtros o registra un nuevo congregante.</p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {personas.map((p) => (
            <Link
              key={p.id}
              href={`/congregantes/${p.id}`}
              className="flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all hover:shadow-sm active:scale-[0.99]"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Avatar nombre={p.nombre_completo} fotoUrl={p.foto_url} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate" style={{ color: 'var(--foreground)' }}>
                  {p.nombre_completo}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                  {[
                    p.ministerio,
                    p.fecha_nacimiento ? `${calcularEdad(p.fecha_nacimiento)} años` : null,
                    p.dni ? `DNI ${p.dni}` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Badge label={estadoLabel[p.estado as keyof typeof estadoLabel].label} variant={estadoLabel[p.estado as keyof typeof estadoLabel].variant} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
