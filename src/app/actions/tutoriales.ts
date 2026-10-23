'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearTutorial(data: {
  titulo: string
  descripcion?: string
  rol_servicio_id?: string
  tipo_destino: string
  url_contenido?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: tut, error } = await supabase.from('tutoriales').insert({
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    rol_servicio_id: data.rol_servicio_id || null,
    tipo_destino: data.tipo_destino,
    url_contenido: data.url_contenido?.trim() || null,
    created_by: user.id,
  }).select().single()

  if (error) return { error: 'No se pudo crear el tutorial.' }
  revalidatePath('/capacitacion')
  return { success: true, id: tut.id }
}

export async function publicarTutorial(id: string, publicado: boolean) {
  const supabase = await createClient()
  const { error } = await supabase.from('tutoriales').update({ publicado }).eq('id', id)
  if (error) return { error: 'No se pudo actualizar.' }
  revalidatePath('/capacitacion')
  revalidatePath(`/capacitacion/${id}`)
  return { success: true }
}

export async function marcarTutorialVisto(tutorial_id: string, persona_id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tutorial_progreso').upsert({
    tutorial_id,
    persona_id,
    visto: true,
    fecha_visto: new Date().toISOString(),
  }, { onConflict: 'persona_id,tutorial_id' })
  if (error) return { error: 'No se pudo registrar.' }
  revalidatePath(`/capacitacion/${tutorial_id}`)
  revalidatePath('/mi', 'layout')
  return { success: true }
}

export async function editarTutorial(id: string, data: {
  titulo: string
  descripcion?: string
  rol_servicio_id?: string
  tipo_destino: string
  url_contenido?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }
  const supabase = await createClient()
  const { error } = await supabase.from('tutoriales').update({
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    rol_servicio_id: data.rol_servicio_id || null,
    tipo_destino: data.tipo_destino,
    url_contenido: data.url_contenido?.trim() || null,
  }).eq('id', id)
  if (error) return { error: 'No se pudo actualizar.' }
  revalidatePath('/capacitacion')
  revalidatePath(`/capacitacion/${id}`)
  return { success: true }
}

// El líder publica un tutorial para su ministerio (visible para sus integrantes).
export async function crearTutorialMinisterio(grupoId: string, data: { titulo: string; url_contenido: string; descripcion?: string }) {
  const titulo = data.titulo.trim()
  if (!titulo) return { error: 'Escribe el título del tutorial.' }
  if (!/^https?:\/\/\S+$/.test(data.url_contenido.trim())) return { error: 'Pega un enlace válido (empieza con https://).' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { error } = await supabase.from('tutoriales').insert({
    titulo, grupo_id: grupoId, tipo_destino: 'general', publicado: true,
    url_contenido: data.url_contenido.trim(), descripcion: data.descripcion?.trim() || null, created_by: user.id,
  })
  if (error) return { error: error.code === '42501' ? 'Solo el líder del ministerio puede agregar tutoriales.' : 'No se pudo guardar el tutorial.' }
  revalidatePath('/capacitacion')
  revalidatePath('/mi', 'layout')
  return { success: true }
}
