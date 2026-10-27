import type { SupabaseClient } from '@supabase/supabase-js'

export interface Integrante { persona_id: string; email: string | null; nombre: string; esLider: boolean }

// Integrantes activos del ministerio con esa clave ('diseno', 'multimedia'…),
// con el líder primero. Usa el cliente de servicio: se llama desde automatizaciones.
export async function integrantesMinisterio(admin: SupabaseClient, clave: string): Promise<Integrante[]> {
  const { data: grupo } = await admin.from('grupos')
    .select('id, encargado_id, lider:personas!grupos_encargado_id_fkey(nombre_completo, email)')
    .eq('clave', clave).eq('activo', true).maybeSingle()
  if (!grupo) return []

  const { data: miembros } = await admin.from('grupo_miembros')
    .select('persona_id, rol_en_grupo, persona:personas(nombre_completo, email)')
    .eq('grupo_id', grupo.id).eq('activo', true)

  const lista: Integrante[] = []
  const lider = grupo.lider as unknown as { nombre_completo: string; email: string | null } | null
  if (grupo.encargado_id && lider) {
    lista.push({ persona_id: grupo.encargado_id, email: lider.email, nombre: lider.nombre_completo, esLider: true })
  }
  for (const m of miembros ?? []) {
    if (m.persona_id === grupo.encargado_id) continue
    const p = m.persona as unknown as { nombre_completo: string; email: string | null } | null
    if (p) lista.push({ persona_id: m.persona_id, email: p.email, nombre: p.nombre_completo, esLider: m.rol_en_grupo === 'lider' })
  }
  return lista
}

// Líderes de un ministerio (y opcionalmente sus ayudantes), para avisos de gestión.
export async function responsablesDe(admin: SupabaseClient, grupoId: string, conAyudantes = false): Promise<string[]> {
  const [{ data: grupo }, { data: miembros }] = await Promise.all([
    admin.from('grupos').select('encargado_id').eq('id', grupoId).maybeSingle(),
    admin.from('grupo_miembros').select('persona_id').eq('grupo_id', grupoId).eq('activo', true)
      .in('rol_en_grupo', conAyudantes ? ['lider', 'ayudante'] : ['lider']),
  ])
  return [...new Set([grupo?.encargado_id as string | null, ...(miembros ?? []).map((m) => m.persona_id as string)].filter(Boolean) as string[])]
}
