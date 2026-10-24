'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { EstadoPersona } from '@/types/database'

export interface FormStateError {
  error: string
  fields?: Record<string, string>
}

export interface PersonaFormData {
  nombre_completo: string
  dni?: string
  fecha_nacimiento?: string
  telefono?: string
  email?: string
  direccion?: string
  ministerios?: string[]
  estado: EstadoPersona
  notas?: string
}

function validar(data: PersonaFormData): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!data.nombre_completo?.trim()) errores.nombre_completo = 'El nombre es obligatorio.'
  if (data.dni && !/^\d{8}$/.test(data.dni)) errores.dni = 'El DNI debe tener 8 dígitos.'
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errores.email = 'Correo inválido.'
  return errores
}

export async function crearPersona(data: PersonaFormData) {
  const errores = validar(data)
  if (Object.keys(errores).length > 0) return { error: 'Revisa los campos indicados.', fields: errores }

  const supabase = await createClient()
  const { data: creada, error } = await supabase.from('personas').insert({
    nombre_completo: data.nombre_completo.trim(),
    dni: data.dni?.trim() || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    telefono: data.telefono?.trim() || null,
    email: data.email?.trim() || null,
    direccion: data.direccion?.trim() || null,
    estado: data.estado,
    notas: data.notas?.trim() || null,
  }).select('id').single()

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una persona registrada con ese DNI.', fields: { dni: 'DNI duplicado.' } }
    return { error: 'No se pudo guardar el registro. Intenta de nuevo.' }
  }

  if (creada) await sincronizarMinisterios(creada.id, data.ministerios ?? [])
  revalidatePath('/congregantes')
  return { success: true }
}

export async function editarPersona(id: string, data: PersonaFormData) {
  const errores = validar(data)
  if (Object.keys(errores).length > 0) return { error: 'Revisa los campos indicados.', fields: errores }

  const supabase = await createClient()
  const { error } = await supabase.from('personas').update({
    nombre_completo: data.nombre_completo.trim(),
    dni: data.dni?.trim() || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    telefono: data.telefono?.trim() || null,
    email: data.email?.trim() || null,
    direccion: data.direccion?.trim() || null,
    estado: data.estado,
    notas: data.notas?.trim() || null,
  }).eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una persona registrada con ese DNI.', fields: { dni: 'DNI duplicado.' } }
    return { error: 'No se pudo actualizar el registro. Intenta de nuevo.' }
  }

  await sincronizarMinisterios(id, data.ministerios ?? [])
  revalidatePath('/congregantes')
  revalidatePath(`/congregantes/${id}`)
  return { success: true }
}

export async function eliminarPersona(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('personas').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar el registro.' }
  revalidatePath('/congregantes')
  return { success: true }
}

// Deja a la persona exactamente en los ministerios elegidos (integrantes reales
// de cada ministerio) y guarda sus nombres en la ficha para mostrarlos en listas.
async function sincronizarMinisterios(personaId: string, grupoIds: string[]) {
  const supabase = await createClient()
  const { data: actuales } = await supabase.from('grupo_miembros').select('grupo_id, activo').eq('persona_id', personaId)
  const elegidos = new Set(grupoIds)
  const quitar = (actuales ?? []).filter((m) => m.activo && !elegidos.has(m.grupo_id)).map((m) => m.grupo_id)
  if (quitar.length) await supabase.from('grupo_miembros').update({ activo: false }).eq('persona_id', personaId).in('grupo_id', quitar)
  if (grupoIds.length) {
    await supabase.from('grupo_miembros').upsert(grupoIds.map((grupo_id) => ({ grupo_id, persona_id: personaId, activo: true })), { onConflict: 'grupo_id,persona_id' })
  }
  const { data: grupos } = grupoIds.length ? await supabase.from('grupos').select('nombre').in('id', grupoIds).order('nombre') : { data: [] }
  await supabase.from('personas').update({ ministerio: (grupos ?? []).map((g) => g.nombre).join(', ') || null }).eq('id', personaId)
  revalidatePath('/ministerios', 'layout')
}
