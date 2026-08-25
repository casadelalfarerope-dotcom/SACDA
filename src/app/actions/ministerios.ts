'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearGrupo(data: {
  nombre: string
  descripcion?: string
  tipo: 'servicio' | 'administrativo'
  grupo_padre_id?: string
  encargado_id?: string
  enlace_whatsapp?: string
}) {
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { error } = await supabase.from('grupos').insert({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo,
    grupo_padre_id: data.grupo_padre_id || null,
    encargado_id: data.encargado_id || null,
    enlace_whatsapp: data.enlace_whatsapp?.trim() || null,
  })

  if (error) return { error: 'No se pudo crear el grupo.' }
  revalidatePath('/ministerios')
  return { success: true }
}

export async function editarGrupo(id: string, data: {
  nombre: string
  descripcion?: string
  tipo: 'servicio' | 'administrativo'
  grupo_padre_id?: string
  encargado_id?: string
  enlace_whatsapp?: string
  activo: boolean
}) {
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio.' }

  const supabase = await createClient()
  const { error } = await supabase.from('grupos').update({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo,
    grupo_padre_id: data.grupo_padre_id || null,
    encargado_id: data.encargado_id || null,
    enlace_whatsapp: data.enlace_whatsapp?.trim() || null,
    activo: data.activo,
  }).eq('id', id)

  if (error) return { error: 'No se pudo actualizar el grupo.' }
  revalidatePath('/ministerios')
  revalidatePath(`/ministerios/${id}`)
  return { success: true }
}

export async function agregarMiembro(grupo_id: string, persona_id: string, rol_en_grupo?: string) {
  if (!grupo_id || !persona_id) return { error: 'Datos incompletos.' }

  const supabase = await createClient()
  const { error } = await supabase.from('grupo_miembros').upsert({
    grupo_id,
    persona_id,
    rol_en_grupo: rol_en_grupo?.trim() || null,
    activo: true,
  }, { onConflict: 'grupo_id,persona_id' })

  if (error) return { error: 'No se pudo agregar el miembro.' }
  revalidatePath(`/ministerios/${grupo_id}`)
  return { success: true }
}

export async function removerMiembro(grupo_miembro_id: string, grupo_id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('grupo_miembros')
    .update({ activo: false })
    .eq('id', grupo_miembro_id)

  if (error) return { error: 'No se pudo remover el miembro.' }
  revalidatePath(`/ministerios/${grupo_id}`)
  return { success: true }
}
