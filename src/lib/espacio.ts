import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface ContextoEspacio {
  userId: string
  personaId: string
  persona: { nombre_completo: string; email: string | null; foto_url: string | null }
  tienePanel: boolean   // tiene algún permiso de ver en el panel de administración
  esServidor: boolean   // integra o lidera algún ministerio, o tiene turnos/tareas asignadas
  esEstudiante: boolean // inscrito en algún curso activo
  sinLeer: number
}

// Datos de la persona que entra a "Mi espacio". Se cachea por petición para
// que el layout y las páginas no repitan las mismas consultas.
export const contextoEspacio = cache(async (): Promise<ContextoEspacio> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: cuenta } = await supabase.from('cuentas')
    .select('persona_id, persona:personas(nombre_completo, email, foto_url)').eq('id', user.id).maybeSingle()
  if (!cuenta) redirect('/login?error=sin_ficha')
  const personaId = cuenta.persona_id as string

  const [{ data: roles }, { count: sinLeer }, { count: inscripciones }, { count: turnos }, { count: tareas }, { count: ministerios }, { count: liderazgos }] = await Promise.all([
    supabase.from('roles_asignados').select('rol_id').eq('persona_id', personaId).eq('activo', true),
    supabase.from('notificaciones').select('id', { count: 'exact', head: true }).eq('persona_id', personaId).eq('leida', false),
    supabase.from('curso_inscripciones').select('id', { count: 'exact', head: true }).eq('persona_id', personaId).eq('activo', true),
    supabase.from('programa_asignaciones').select('id', { count: 'exact', head: true }).eq('persona_id', personaId),
    supabase.from('tareas').select('id', { count: 'exact', head: true }).eq('asignado_id', personaId).neq('tipo', 'solicitud_venta'),
    supabase.from('grupo_miembros').select('id', { count: 'exact', head: true }).eq('persona_id', personaId).eq('activo', true),
    supabase.from('grupos').select('id', { count: 'exact', head: true }).eq('encargado_id', personaId).eq('activo', true),
  ])

  const rolIds = (roles ?? []).map((r) => r.rol_id as string)
  const { count: permisos } = rolIds.length
    ? await supabase.from('permisos_modulo').select('id', { count: 'exact', head: true }).in('rol_id', rolIds).eq('puede_ver', true)
    : { count: 0 }

  return {
    userId: user.id,
    personaId,
    persona: cuenta.persona as unknown as ContextoEspacio['persona'],
    tienePanel: (permisos ?? 0) > 0,
    esServidor: (ministerios ?? 0) > 0 || (liderazgos ?? 0) > 0 || (turnos ?? 0) > 0 || (tareas ?? 0) > 0,
    esEstudiante: (inscripciones ?? 0) > 0,
    sinLeer: sinLeer ?? 0,
  }
})

// Los avisos se crearon con enlaces del panel; para quien usa Mi espacio se
// traducen a la página equivalente.
export function enlaceEspacio(url: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('/taller') || url.startsWith('/mi')) return url
  const tarea = url.match(/^\/tareas\/([0-9a-f-]{36})/)
  if (tarea) return `/mi/tareas/${tarea[1]}`
  if (url.startsWith('/servidores')) return '/mi/servicio'
  if (url.startsWith('/capacitacion')) return '/mi/servicio'
  if (url.startsWith('/ventas')) return '/mi/solicitudes'
  return undefined
}
