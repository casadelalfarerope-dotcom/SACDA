import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Plus } from 'lucide-react'
import { formatDateShort } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'

const estadoVariant: Record<string, 'warning' | 'success' | 'default'> = {
  pendiente: 'warning',
  contactado: 'default',
  regular: 'success',
  inactivo: 'default',
}
const estadoLabel: Record<string, string> = {
  pendiente: 'Pendiente',
  contactado: 'Contactado',
  regular: 'Regular',
  inactivo: 'Inactivo',
}

export default async function VisitasPage() {
  const supabase = await createClient()

  const { data: visitas } = await supabase
    .from('seguimiento_visitas')
    .select('*, persona:personas(id, nombre_completo, foto_url)')
    .order('fecha_primera_visita', { ascending: false })

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/miembros"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Visitas</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{visitas?.length ?? 0} registros</p>
        </div>
        <Link href="/miembros/visitas/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--accent)' }}>
          <Plus size={15} /> Nueva
        </Link>
      </div>

      {!visitas || visitas.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <UserPlus size={40} className="mx-auto mb-3 opacity-30" />
          <p>Sin visitas registradas.</p>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {visitas.map((v) => {
            const persona = Array.isArray(v.persona) ? v.persona[0] : v.persona
            return (
              <div key={v.id}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                {persona && (
                  <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                    {persona?.nombre_completo ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Primera visita: {formatDateShort(v.fecha_primera_visita)}
                    {v.volvio ? ' · Volvió' : ''}
                  </p>
                </div>
                <Badge label={estadoLabel[v.estado] ?? v.estado} variant={estadoVariant[v.estado] ?? 'default'} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
