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
    .select('persona_id, persona:personas(nombre_completo, email)')
    .eq('grupo_id', grupo.id).eq('activo', true)

  const lista: Integrante[] = []
  const lider = grupo.lider as unknown as { nombre_completo: string; email: string | null } | null
  if (grupo.encargado_id && lider) {
    lista.push({ persona_id: grupo.encargado_id, email: lider.email, nombre: lider.nombre_completo, esLider: true })
  }
  for (const m of miembros ?? []) {
    if (m.persona_id === grupo.encargado_id) continue
    const p = m.persona as unknown as { nombre_completo: string; email: string | null } | null
    if (p) lista.push({ persona_id: m.persona_id, email: p.email, nombre: p.nombre_completo, esLider: false })
  }
  return lista
}
