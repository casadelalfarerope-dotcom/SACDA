'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function asignarRol(persona_id: string, rol_id: string, fecha_inicio: string) {
  if (!persona_id || !rol_id) return { error: 'Datos incompletos.' }

  const supabase = await createClient()

  // Desactivar si existía previamente inactivo
  await supabase
    .from('roles_asignados')
    .update({ activo: true, fecha_fin: null })
    .eq('persona_id', persona_id)
    .eq('rol_id', rol_id)
    .eq('activo', false)

  const { error } = await supabase.from('roles_asignados').upsert({
    persona_id,
    rol_id,
    fecha_inicio,
    activo: true,
    fecha_fin: null,
  }, { onConflict: 'persona_id,rol_id' })

  if (error) return { error: 'No se pudo asignar el rol.' }
  revalidatePath('/roles')
  return { success: true }
}

export async function revocarRol(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('roles_asignados')
    .update({ activo: false, fecha_fin: new Date().toISOString().split('T')[0] })
    .eq('id', id)

  if (error) return { error: 'No se pudo revocar el rol.' }
  revalidatePath('/roles')
  return { success: true }
}

export async function crearRol(nombre: string, descripcion?: string) {
  if (!nombre?.trim()) return { error: 'El nombre del rol es obligatorio.' }

  const supabase = await createClient()
  const { error } = await supabase.from('roles').insert({
    nombre: nombre.trim().toLowerCase().replace(/\s+/g, '_'),
    descripcion: descripcion?.trim() || null,
  })

  if (error) {
    if (error.code === '23505') return { error: 'Ya existe un rol con ese nombre.' }
    return { error: 'No se pudo crear el rol.' }
  }

  revalidatePath('/roles')
  return { success: true }
}

export async function actualizarPermiso(
  rol_id: string,
  modulo: string,
  campo: 'puede_ver' | 'puede_crear' | 'puede_editar' | 'puede_eliminar',
  valor: boolean
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('permisos_modulo')
    .upsert({ rol_id, modulo, [campo]: valor }, { onConflict: 'rol_id,modulo' })

  if (error) return { error: 'No se pudo actualizar el permiso.' }
  revalidatePath('/roles')
  return { success: true }
}
