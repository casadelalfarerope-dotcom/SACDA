import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/ui/Avatar'
import Badge from '@/components/ui/Badge'
import { formatDateShort } from '@/lib/utils'
import { Shield, Users } from 'lucide-react'

const MODULOS = [
  { key: 'congregantes', label: 'Congregantes' },
  { key: 'miembros',     label: 'Miembros' },
  { key: 'ministerios',  label: 'Ministerios' },
  { key: 'calendario',   label: 'Calendario' },
  { key: 'servidores',   label: 'Servidores' },
  { key: 'diseno',       label: 'Diseño' },
  { key: 'finanzas',     label: 'Finanzas' },
  { key: 'inventario',   label: 'Inventario' },
  { key: 'academia',     label: 'Academia' },
  { key: 'roles',        label: 'Roles' },
]

export default async function RolesPage() {
  const supabase = await createClient()

  const [{ data: roles }, { data: asignaciones }] = await Promise.all([
    supabase.from('roles').select('*').order('nombre'),
    supabase.from('roles_asignados')
      .select('*, persona:personas(id, nombre_completo, foto_url), rol:roles(nombre)')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Agrupar asignaciones por rol
  const porRol: Record<string, typeof asignaciones> = {}
  for (const a of asignaciones ?? []) {
    const nombre = a.rol?.nombre ?? 'sin_rol'
    if (!porRol[nombre]) porRol[nombre] = []
    porRol[nombre]!.push(a)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield size={22} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            Roles y Permisos
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {roles?.length ?? 0} roles configurados
          </p>
        </div>
      </div>

      {/* Roles del sistema y personas asignadas */}
      <section>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          Miembros por rol
        </h2>
        <div className="space-y-3">
          {roles?.map((rol) => {
            const miembros = porRol[rol.nombre] ?? []
            return (
              <div key={rol.id}
                className="rounded-2xl border px-5 py-4"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold capitalize" style={{ color: 'var(--foreground)' }}>
                      {rol.nombre.replace(/_/g, ' ')}
                    </p>
                    {rol.descripcion && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                        {rol.descripcion}
                      </p>
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
                      const persona = Array.isArray(a.persona) ? a.persona[0] : a.persona
                      return (
                        <div key={a.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                          style={{ background: 'var(--surface-secondary)', color: 'var(--foreground)' }}>
                          {persona && (
                            <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url} size="sm" />
                          )}
                          <span>{persona?.nombre_completo.split(' ').slice(0, 2).join(' ')}</span>
                          <span style={{ color: 'var(--muted)' }}>
                            desde {formatDateShort(a.fecha_inicio)}
                          </span>
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

      {/* Tabla de permisos por módulo */}
      <section>
        <h2 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
          Permisos por módulo
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
          Los permisos granulares se gestionan desde la configuración avanzada.
          Roles clave por defecto:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { rol: 'administrador', desc: 'Acceso total al sistema', variant: 'destructive' as const },
            { rol: 'pastor',        desc: 'Lectura total, edición moderada', variant: 'default' as const },
            { rol: 'tesorero',      desc: 'Solo módulo Finanzas', variant: 'warning' as const },
          ].map(({ rol, desc, variant }) => (
            <div key={rol}
              className="rounded-2xl border p-4"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Badge label={rol} variant={variant} className="mb-2" />
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--muted)' }}>
          Los permisos completos se configuran por rol y modulo en la base de datos mediante la tabla{' '}
          <code className="px-1 py-0.5 rounded" style={{ background: 'var(--surface-secondary)' }}>
            permisos_modulo
          </code>.
        </p>
      </section>
    </div>
  )
}
