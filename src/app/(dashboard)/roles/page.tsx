import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/ui/Avatar'
import { formatDateShort } from '@/lib/utils'
import { Shield, Users } from 'lucide-react'
import AsignarRolForm from '@/components/roles/AsignarRolForm'
import RevocarRolBtn from '@/components/roles/RevocarRolBtn'

export default async function RolesPage() {
  const supabase = await createClient()

  const [{ data: roles }, { data: asignaciones }, { data: personas }] = await Promise.all([
    supabase.from('roles').select('*').order('nombre'),
    supabase.from('roles_asignados')
      .select('*, persona:personas(id, nombre_completo, foto_url), rol:roles(nombre)')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
  ])

  const porRol: Record<string, typeof asignaciones> = {}
  for (const a of asignaciones ?? []) {
    const nombre = (a.rol as { nombre: string } | null)?.nombre ?? 'sin_rol'
    if (!porRol[nombre]) porRol[nombre] = []
    porRol[nombre]!.push(a)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Shield size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Roles y Permisos</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{roles?.length ?? 0} roles configurados</p>
          </div>
        </div>
        <AsignarRolForm personas={personas ?? []} roles={roles ?? []} />
      </div>

      <section>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>Miembros por rol</h2>
        <div className="space-y-3 stagger">
          {roles?.map((rol) => {
            const miembros = porRol[rol.nombre] ?? []
            return (
              <div key={rol.id} className="rounded-2xl border px-5 py-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                      {rol.nombre.replace(/_/g, ' ')}
                    </p>
                    {rol.descripcion && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{rol.descripcion}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                    <Users size={14} />
                    {miembros.length}
                  </div>
                </div>

                {miembros.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {miembros.map((a) => {
                      const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona as { nombre_completo: string; foto_url?: string } | null
                      return (
                        <div key={a.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>
                          {persona && (
                            <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url ?? null} size="sm" />
                          )}
                          <span>{persona?.nombre_completo.split(' ').slice(0, 2).join(' ')}</span>
                          <span style={{ color: 'var(--muted)' }}>
                            desde {formatDateShort(a.fecha_inicio)}
                          </span>
                          <RevocarRolBtn asignacionId={a.id} />
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Sin miembros asignados</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
