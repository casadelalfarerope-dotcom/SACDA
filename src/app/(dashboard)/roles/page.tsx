import { createClient } from '@/lib/supabase/server'
import Avatar from '@/components/ui/Avatar'
import { formatDateShort } from '@/lib/utils'
import { Shield } from 'lucide-react'
import { IconoModulo } from '@/components/ui/IconoApp'
import { Pagina, Grupo, Fila } from '@/components/ui/ios'
import AsignarRolForm from '@/components/roles/AsignarRolForm'
import RevocarRolBtn from '@/components/roles/RevocarRolBtn'

const NOMBRE_MODULO: Record<string, string> = {
  congregantes: 'Congregantes', miembros: 'Seguimiento', ministerios: 'Ministerios', calendario: 'Calendario',
  servidores: 'Servidores', diseno: 'Tareas', ventas: 'Ventas', academia: 'Academia', capacitacion: 'Capacitación',
  finanzas: 'Finanzas', inventario: 'Inventario', roles: 'Roles', notificaciones: 'Notificaciones',
}
const MODULOS_TOTALES = Object.keys(NOMBRE_MODULO).length

export default async function RolesPage() {
  const supabase = await createClient()

  const [{ data: roles }, { data: asignaciones }, { data: personas }, { data: permisos }] = await Promise.all([
    supabase.from('roles').select('*').order('nombre'),
    supabase.from('roles_asignados')
      .select('*, persona:personas!roles_asignados_persona_id_fkey(id, nombre_completo, foto_url), rol:roles(nombre)')
      .eq('activo', true)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('personas').select('id, nombre_completo').eq('estado', 'activo').order('nombre_completo'),
    supabase.from('permisos_modulo').select('rol_id, modulo, puede_crear, puede_editar').eq('puede_ver', true),
  ])

  // Resumen legible de lo que ve cada rol en el panel.
  const acceso = (rolId: string) => {
    const lista = (permisos ?? []).filter((p) => p.rol_id === rolId)
    if (lista.length >= MODULOS_TOTALES) return 'Todo el sistema'
    return lista.map((p) => `${NOMBRE_MODULO[p.modulo] ?? p.modulo}${p.puede_crear || p.puede_editar ? '' : ' (solo ver)'}`).join(', ')
  }

  const porRol: Record<string, typeof asignaciones> = {}
  for (const a of asignaciones ?? []) {
    const nombre = (a.rol as { nombre: string } | null)?.nombre ?? 'sin_rol'
    if (!porRol[nombre]) porRol[nombre] = []
    porRol[nombre]!.push(a)
  }

  const conMiembros = (roles ?? []).filter((r) => (porRol[r.nombre] ?? []).length > 0)
  const vacios = (roles ?? []).filter((r) => !(porRol[r.nombre] ?? []).length)
  const NOMBRES: Record<string, string> = { coordinacion: 'Coordinación', tesoreria: 'Tesorería', academico: 'Académico' }
  const nombreRol = (n: string) => NOMBRES[n] ?? n.charAt(0).toUpperCase() + n.slice(1).replace(/_/g, ' ')

  return (
    <Pagina titulo="Roles" subtitulo="Quién puede entrar al panel de administración y qué ve">
      <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
        Los roles solo dan acceso al panel. Dónde sirve cada persona (Multimedia, Alabanza, Limpieza…) se define en{' '}
        <a href="/ministerios" className="underline" style={{ color: 'var(--accent)' }}>Ministerios</a>.
        Quien no tiene rol usa solo Mi espacio.
      </p>

      <AsignarRolForm personas={personas ?? []} roles={(roles ?? []).map((r) => ({ ...r, nombre: nombreRol(r.nombre) }))} />

      {conMiembros.map((rol) => (
        <Grupo key={rol.id} titulo={`${nombreRol(rol.nombre)} · ${(porRol[rol.nombre] ?? []).length}`} pie={`Ve: ${acceso(rol.id)}`}>
          {(porRol[rol.nombre] ?? []).map((a, i) => {
            const persona = (Array.isArray(a.persona) ? a.persona[0] : a.persona) as { nombre_completo: string; foto_url?: string | null } | null
            return (
              <Fila key={a.id} primero={i === 0}
                inicio={persona ? <Avatar nombre={persona.nombre_completo} fotoUrl={persona.foto_url ?? null} size="sm" /> : undefined}
                titulo={persona?.nombre_completo ?? '—'}
                subtitulo={`Desde ${formatDateShort(a.fecha_inicio)}`}
                detalle={<RevocarRolBtn asignacionId={a.id} />} />
            )
          })}
        </Grupo>
      ))}

      {vacios.length > 0 && (
        <Grupo titulo="Sin miembros asignados">
          {vacios.map((rol, i) => (
            <Fila key={rol.id} primero={i === 0} inicio={<IconoModulo icon={Shield} color="#8e8e93" />}
              titulo={nombreRol(rol.nombre)} subtitulo={`Ve: ${acceso(rol.id)}`} />
          ))}
        </Grupo>
      )}
    </Pagina>
  )
}
