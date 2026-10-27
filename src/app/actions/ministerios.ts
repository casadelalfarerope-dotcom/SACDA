'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  const { data: nuevo, error } = await supabase.from('grupos').insert({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo,
    grupo_padre_id: data.grupo_padre_id || null,
    encargado_id: data.encargado_id || null,
    enlace_whatsapp: data.enlace_whatsapp?.trim() || null,
  }).select('id').single()

  if (error) return { error: 'No se pudo crear el grupo.' }
  if (data.encargado_id && nuevo) await hacerLiderDeContacto(nuevo.id as string, data.encargado_id)
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
  if (data.encargado_id) await hacerLiderDeContacto(id, data.encargado_id)
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
  // No se puede dejar al ministerio sin líder.
  const admin = createServiceClient()
  const [{ data: fila }, { data: lideres }, { data: grupo }] = await Promise.all([
    admin.from('grupo_miembros').select('persona_id, rol_en_grupo').eq('id', grupo_miembro_id).maybeSingle(),
    admin.from('grupo_miembros').select('persona_id').eq('grupo_id', grupo_id).eq('activo', true).eq('rol_en_grupo', 'lider'),
    admin.from('grupos').select('encargado_id').eq('id', grupo_id).maybeSingle(),
  ])
  const actuales = new Set([...(lideres ?? []).map((l) => l.persona_id as string), ...(grupo?.encargado_id ? [grupo.encargado_id as string] : [])])
  if (fila && actuales.has(fila.persona_id) && actuales.size <= 1) {
    return { error: 'Es el único líder del ministerio. Nombra a otro líder antes de quitarlo.' }
  }
  const { error } = await supabase
    .from('grupo_miembros')
    .update({ activo: false, rol_en_grupo: null })
    .eq('id', grupo_miembro_id)
  if (!error && fila && grupo?.encargado_id === fila.persona_id) {
    await admin.from('grupos').update({ encargado_id: [...actuales].find((x) => x !== fila.persona_id) ?? null }).eq('id', grupo_id)
  }

  if (error) return { error: 'No se pudo remover el miembro.' }
  revalidatePath(`/ministerios/${grupo_id}`)
  return { success: true }
}

// ---------- Líderes y ayudantes ----------

// El líder de contacto (elegido en la ficha) también queda como líder del ministerio.
async function hacerLiderDeContacto(grupoId: string, personaId: string) {
  await createServiceClient().from('grupo_miembros').upsert(
    { grupo_id: grupoId, persona_id: personaId, rol_en_grupo: 'lider', activo: true },
    { onConflict: 'grupo_id,persona_id' },
  )
}

// Cambia el rol de un integrante: 'lider', 'ayudante' o null (integrante).
// Pueden hacerlo los líderes del ministerio (o de su ministerio padre) y
// Administración/Coordinación. Nunca queda un ministerio sin líder.
export async function cambiarRolIntegrante(grupoId: string, personaId: string, rol: 'lider' | 'ayudante' | null) {
  const supabase = await createClient()
  const [{ data: esLider }, { data: esAdmin }] = await Promise.all([
    supabase.rpc('es_lider_o_padre', { p_grupo: grupoId }),
    supabase.rpc('tiene_permiso', { p_modulo: 'ministerios', p_accion: 'editar' }),
  ])
  if (esLider !== true && esAdmin !== true) return { error: 'Solo un líder del ministerio puede cambiar roles.' }

  const admin = createServiceClient()
  const [{ data: grupo }, { data: lideres }] = await Promise.all([
    admin.from('grupos').select('nombre, encargado_id').eq('id', grupoId).single(),
    admin.from('grupo_miembros').select('persona_id').eq('grupo_id', grupoId).eq('activo', true).eq('rol_en_grupo', 'lider'),
  ])
  if (!grupo) return { error: 'No se encontró el ministerio.' }
  const actuales = new Set([...(lideres ?? []).map((l) => l.persona_id as string), ...(grupo.encargado_id ? [grupo.encargado_id as string] : [])])
  if (rol !== 'lider' && actuales.has(personaId) && actuales.size <= 1) {
    return { error: 'El ministerio debe tener al menos un líder. Nombra a otro líder antes de quitar a este.' }
  }

  const { error } = await admin.from('grupo_miembros').upsert(
    { grupo_id: grupoId, persona_id: personaId, rol_en_grupo: rol, activo: true },
    { onConflict: 'grupo_id,persona_id' },
  )
  if (error) return { error: 'No se pudo cambiar el rol.' }

  // El líder de contacto siempre es uno de los líderes.
  if (rol === 'lider' && !grupo.encargado_id) {
    await admin.from('grupos').update({ encargado_id: personaId }).eq('id', grupoId)
  } else if (rol !== 'lider' && grupo.encargado_id === personaId) {
    const otro = [...actuales].find((id) => id !== personaId) ?? null
    await admin.from('grupos').update({ encargado_id: otro }).eq('id', grupoId)
  }

  if (rol) {
    await admin.from('notificaciones').insert({
      persona_id: personaId, tipo: 'general',
      titulo: rol === 'lider' ? `Ahora eres líder de ${grupo.nombre}` : `Ahora eres ayudante de ${grupo.nombre}`,
      cuerpo: rol === 'lider'
        ? 'Puedes programar, crear eventos, pasar lista, asignar tareas y nombrar a otros líderes o ayudantes.'
        : 'Puedes crear eventos del ministerio, pasar lista y programar los turnos.',
      url: `/mi/ministerios/${grupoId}`,
    })
  }
  revalidatePath(`/ministerios/${grupoId}`)
  revalidatePath('/mi', 'layout')
  return { success: true }
}
