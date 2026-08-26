'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TipoCeremonia, EstadoSeguimiento, EstadoAusencia } from '@/types/database'

// ---- CEREMONIAS ----

export async function crearCeremonia(data: {
  tipo: TipoCeremonia
  fecha: string
  descripcion?: string
  officiante?: string
  participantes: Array<{
    persona_id?: string
    nombre_externo?: string
    rol_en_ceremonia: string
  }>
}) {
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }
  if (data.participantes.length === 0) return { error: 'Agrega al menos un participante.' }

  const supabase = await createClient()

  const { data: ceremonia, error } = await supabase
    .from('ceremonias')
    .insert({
      tipo: data.tipo,
      fecha: data.fecha,
      descripcion: data.descripcion || null,
      officiante: data.officiante || null,
    })
    .select('id')
    .single()

  if (error || !ceremonia) return { error: 'No se pudo registrar la ceremonia.' }

  const participantesData = data.participantes.map((p) => ({
    ceremonia_id: ceremonia.id,
    persona_id: p.persona_id || null,
    nombre_externo: p.nombre_externo || null,
    rol_en_ceremonia: p.rol_en_ceremonia,
  }))

  await supabase.from('ceremonia_personas').insert(participantesData)

  revalidatePath('/miembros')
  revalidatePath('/miembros/ceremonias')
  return { success: true }
}

// ---- VISITAS ----

export async function crearVisita(data: {
  persona_id: string
  fecha_primera_visita: string
  referido_por?: string
  seguimiento_por?: string
  notas?: string
}) {
  if (!data.persona_id) return { error: 'Selecciona a la persona.' }
  if (!data.fecha_primera_visita) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { error } = await supabase.from('seguimiento_visitas').insert({
    persona_id: data.persona_id,
    fecha_primera_visita: data.fecha_primera_visita,
    referido_por: data.referido_por || null,
    seguimiento_por: data.seguimiento_por || null,
    notas: data.notas || null,
    estado: 'pendiente',
    volvio: false,
  })

  if (error) return { error: 'No se pudo registrar la visita.' }
  revalidatePath('/miembros')
  revalidatePath('/miembros/visitas')
  return { success: true }
}

export async function actualizarSeguimientoVisita(id: string, data: {
  estado: EstadoSeguimiento
  volvio: boolean
  seguimiento_por?: string
  notas?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('seguimiento_visitas').update({
    estado: data.estado,
    volvio: data.volvio,
    seguimiento_por: data.seguimiento_por || null,
    notas: data.notas || null,
  }).eq('id', id)

  if (error) return { error: 'No se pudo actualizar el seguimiento.' }
  revalidatePath('/miembros')
  revalidatePath('/miembros/visitas')
  return { success: true }
}

// ---- AUSENCIAS ----

export async function registrarAusencia(data: {
  persona_id: string
  fecha: string
  motivo?: string
  seguimiento_por?: string
}) {
  if (!data.persona_id) return { error: 'Selecciona a la persona.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { error } = await supabase.from('ausencias').insert({
    persona_id: data.persona_id,
    fecha: data.fecha,
    motivo: data.motivo || null,
    seguimiento_por: data.seguimiento_por || null,
    estado: 'pendiente',
  })

  if (error) return { error: 'No se pudo registrar la ausencia.' }
  revalidatePath('/miembros')
  revalidatePath('/miembros/ausencias')
  return { success: true }
}

export async function actualizarAusencia(id: string, estado: EstadoAusencia, seguimiento_por?: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('ausencias').update({
    estado,
    seguimiento_por: seguimiento_por || null,
  }).eq('id', id)

  if (error) return { error: 'No se pudo actualizar la ausencia.' }
  revalidatePath('/miembros')
  revalidatePath('/miembros/ausencias')
  return { success: true }
}
