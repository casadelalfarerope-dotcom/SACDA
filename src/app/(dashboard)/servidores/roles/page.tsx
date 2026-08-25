import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NuevoRolForm from '@/components/servidores/NuevoRolForm'

export default async function RolesServicioPage() {
  const supabase = await createClient()
  const { data: roles } = await supabase.from('roles_servicio').select('*').order('orden')

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/servidores"
          className="p-2 rounded-xl hover:opacity-70 transition-opacity"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={18} style={{ color: 'var(--foreground)' }} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Roles de servicio</h1>
      </div>

      <div className="space-y-2 mb-8">
        {(roles ?? []).map((r) => (
          <div key={r.id}
            className="flex items-center gap-3 p-4 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: r.color }} />
            <div className="flex-1">
              <p className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{r.nombre}</p>
              {r.descripcion && <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{r.descripcion}</p>}
            </div>
            {r.requiere_material && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-secondary)', color: 'var(--muted)' }}>
                material
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="p-5 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <p className="font-semibold text-sm mb-4" style={{ color: 'var(--foreground)' }}>Agregar rol</p>
        <NuevoRolForm />
      </div>
    </div>
  )
}
