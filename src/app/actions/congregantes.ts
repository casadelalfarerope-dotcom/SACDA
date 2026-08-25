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
  ministerio?: string
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
  const { error } = await supabase.from('personas').insert({
    nombre_completo: data.nombre_completo.trim(),
    dni: data.dni?.trim() || null,
    fecha_nacimiento: data.fecha_nacimiento || null,
    telefono: data.telefono?.trim() || null,
    email: data.email?.trim() || null,
    direccion: data.direccion?.trim() || null,
    ministerio: data.ministerio?.trim() || null,
    estado: data.estado,
    notas: data.notas?.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una persona registrada con ese DNI.', fields: { dni: 'DNI duplicado.' } }
    return { error: 'No se pudo guardar el registro. Intenta de nuevo.' }
  }

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
    ministerio: data.ministerio?.trim() || null,
    estado: data.estado,
    notas: data.notas?.trim() || null,
  }).eq('id', id)

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe una persona registrada con ese DNI.', fields: { dni: 'DNI duplicado.' } }
    return { error: 'No se pudo actualizar el registro. Intenta de nuevo.' }
  }

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
