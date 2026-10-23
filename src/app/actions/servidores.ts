'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sugerirMinisterio } from '@/lib/programas'
import { formatDate } from '@/lib/utils'

// Los permisos los decide la base de datos: quien tiene el módulo Servidores
// o el líder del ministerio dueño del puesto. Si no puede, la operación no
// afecta ninguna fila y se responde con un error.

function revalidar(programaId?: string) {
  revalidatePath('/servidores')
  if (programaId) revalidatePath(`/servidores/${programaId}`)
  revalidatePath('/mi', 'layout')
}

const SIN_PERMISO = 'No tienes permiso para cambiar este ministerio.'

export async function agregarAsignacion(data: { programa_id: string; rol_servicio_id: string; persona_id: string }) {
  if (!data.rol_servicio_id || !data.persona_id) return { error: 'Elige el puesto y la persona.' }
  const supabase = await createClient()
  const { error } = await supabase.from('programa_asignaciones').insert({
    programa_id: data.programa_id, rol_servicio_id: data.rol_servicio_id, persona_id: data.persona_id,
  })
  if (error) return { error: error.code === '42501' ? SIN_PERMISO : 'No se pudo agregar la asignación.' }
  revalidar(data.programa_id)
  return { success: true }
}

export async function eliminarAsignacion(id: string, programa_id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('programa_asignaciones').delete().eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo quitar la asignación.' }
  revalidar(programa_id)
  return { success: true }
}

export async function subirMaterial(id: string, url: string, programa_id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('programa_asignaciones')
    .update({ material_url: url, estado_material: 'subido' }).eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo guardar el enlace.' }
  revalidar(programa_id)
  return { success: true }
}

// Llena los puestos vacíos de un ministerio con la sugerencia (fijos o rotación).
export async function llenarSugerencias(programaId: string, grupoId: string) {
  const supabase = await createClient()
  const sugerencias = await sugerirMinisterio(supabase, programaId, grupoId)
  if (!sugerencias.length) return { error: 'No hay sugerencias: revisa que el ministerio tenga puestos e integrantes, o que no esté ya completo.' }
  const { error } = await supabase.from('programa_asignaciones').insert(
    sugerencias.map((s) => ({ programa_id: programaId, rol_servicio_id: s.puesto_id, persona_id: s.persona_id })),
  )
  if (error) return { error: error.code === '42501' ? SIN_PERMISO : 'No se pudieron guardar las sugerencias.' }
  revalidar(programaId)
  return { success: true, cantidad: sugerencias.length }
}

// Publica la parte de un ministerio y avisa a sus asignados. No requiere aprobación.
export async function publicarMinisterio(programaId: string, grupoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()

  const { data: puestos } = await supabase.from('roles_servicio').select('id, nombre').eq('grupo_id', grupoId)
  const puestoIds = (puestos ?? []).map((p) => p.id as string)
  const { data: asignados } = puestoIds.length
    ? await supabase.from('programa_asignaciones').select('persona_id, rol_servicio_id').eq('programa_id', programaId).in('rol_servicio_id', puestoIds)
    : { data: [] }
  if (!asignados?.length) return { error: 'Asigna al menos a una persona antes de publicar.' }

  const { error } = await supabase.from('programa_ministerios').upsert({
    programa_id: programaId, grupo_id: grupoId, estado: 'publicado',
    publicado_por: cuenta?.persona_id ?? null, publicado_at: new Date().toISOString(),
  })
  if (error) return { error: error.code === '42501' ? SIN_PERMISO : 'No se pudo publicar.' }

  const { data: programa } = await supabase.from('programas').select('titulo, fecha').eq('id', programaId).single()
  const nombrePuesto = new Map((puestos ?? []).map((p) => [p.id as string, p.nombre as string]))
  const admin = createServiceClient()
  await admin.from('notificaciones').insert(asignados.map((a) => ({
    persona_id: a.persona_id,
    tipo: 'turno_asignado',
    titulo: `Te toca servir: ${nombrePuesto.get(a.rol_servicio_id as string) ?? 'Servicio'}`,
    cuerpo: `${programa?.titulo ?? 'Culto'} · ${programa ? formatDate(programa.fecha) : ''}`,
    url: '/mi/servicio',
  })))

  revalidar(programaId)
  return { success: true }
}

// Vuelve a borrador para corregir (los avisos ya enviados no se retiran).
export async function despublicarMinisterio(programaId: string, grupoId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('programa_ministerios')
    .update({ estado: 'borrador' }).eq('programa_id', programaId).eq('grupo_id', grupoId).select('grupo_id')
  if (error || !data?.length) return { error: SIN_PERMISO }
  revalidar(programaId)
  return { success: true }
}

// ---------- Puestos del ministerio ----------

export async function crearPuesto(grupoId: string, datos: { nombre: string; cantidad: number; modo: 'fijo' | 'rotativo'; requiere_material: boolean }) {
  const nombre = datos.nombre.trim()
  if (!nombre) return { error: 'Escribe el nombre del puesto.' }
  if (nombre.length > 60) return { error: 'El nombre es demasiado largo.' }
  if (!(datos.cantidad >= 1 && datos.cantidad <= 20)) return { error: 'La cantidad debe estar entre 1 y 20.' }
  const supabase = await createClient()
  const { count } = await supabase.from('roles_servicio').select('id', { count: 'exact', head: true }).eq('grupo_id', grupoId)
  const { error } = await supabase.from('roles_servicio').insert({
    nombre, grupo_id: grupoId, cantidad: datos.cantidad, modo: datos.modo,
    requiere_material: datos.requiere_material, orden: count ?? 0,
  })
  if (error) return { error: error.code === '42501' ? SIN_PERMISO : 'No se pudo crear el puesto.' }
  revalidatePath(`/ministerios/${grupoId}`)
  revalidar()
  return { success: true }
}

export async function actualizarPuesto(id: string, grupoId: string, cambios: { cantidad?: number; modo?: 'fijo' | 'rotativo'; requiere_material?: boolean }) {
  if (cambios.cantidad !== undefined && !(cambios.cantidad >= 1 && cambios.cantidad <= 20)) return { error: 'La cantidad debe estar entre 1 y 20.' }
  const supabase = await createClient()
  const { data, error } = await supabase.from('roles_servicio').update(cambios).eq('id', id).select('id')
  if (error || !data?.length) return { error: SIN_PERMISO }
  revalidatePath(`/ministerios/${grupoId}`)
  revalidar()
  return { success: true }
}

export async function eliminarPuesto(id: string, grupoId: string) {
  const supabase = await createClient()
  const { count } = await supabase.from('programa_asignaciones').select('id', { count: 'exact', head: true }).eq('rol_servicio_id', id)
  // Si ya tiene turnos registrados, se desactiva para no perder el historial.
  const { data, error } = count
    ? await supabase.from('roles_servicio').update({ activo: false }).eq('id', id).select('id')
    : await supabase.from('roles_servicio').delete().eq('id', id).select('id')
  if (error || !data?.length) return { error: SIN_PERMISO }
  revalidatePath(`/ministerios/${grupoId}`)
  revalidar()
  return { success: true }
}

// Guarda quiénes pueden ocupar el puesto, en el orden de rotación.
export async function guardarCandidatos(puestoId: string, grupoId: string, personaIds: string[]) {
  const supabase = await createClient()
  const { error: delError } = await supabase.from('puesto_candidatos').delete().eq('puesto_id', puestoId)
  if (delError) return { error: SIN_PERMISO }
  if (personaIds.length) {
    const { error } = await supabase.from('puesto_candidatos')
      .insert(personaIds.map((persona_id, orden) => ({ puesto_id: puestoId, persona_id, orden })))
    if (error) return { error: error.code === '42501' ? SIN_PERMISO : 'No se pudo guardar la lista.' }
  }
  revalidatePath(`/ministerios/${grupoId}`)
  revalidar()
  return { success: true }
}
