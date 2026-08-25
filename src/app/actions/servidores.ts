'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function crearPrograma(data: {
  titulo: string
  fecha: string
  evento_id?: string
  notas?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: cuenta } = await supabase.from('cuentas').select('id').eq('id', user.id).single()

  const { data: prog, error } = await supabase.from('programas').insert({
    titulo: data.titulo.trim(),
    fecha: data.fecha,
    evento_id: data.evento_id || null,
    notas: data.notas?.trim() || null,
    created_by: cuenta?.id ?? null,
  }).select().single()

  if (error) return { error: 'No se pudo crear el programa.' }
  revalidatePath('/servidores')
  return { success: true, id: prog.id }
}

export async function publicarPrograma(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('programas').update({ estado: 'publicado' }).eq('id', id)
  if (error) return { error: 'No se pudo publicar.' }
  revalidatePath('/servidores')
  revalidatePath(`/servidores/${id}`)
  return { success: true }
}

export async function agregarAsignacion(data: {
  programa_id: string
  rol_servicio_id: string
  persona_id: string
  notas?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('programa_asignaciones').insert({
    programa_id: data.programa_id,
    rol_servicio_id: data.rol_servicio_id,
    persona_id: data.persona_id,
    notas: data.notas?.trim() || null,
  })
  if (error) return { error: 'No se pudo agregar la asignación.' }
  revalidatePath(`/servidores/${data.programa_id}`)
  return { success: true }
}

export async function eliminarAsignacion(id: string, programa_id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('programa_asignaciones').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar.' }
  revalidatePath(`/servidores/${programa_id}`)
  return { success: true }
}

export async function subirMaterial(id: string, url: string, programa_id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('programa_asignaciones')
    .update({ material_url: url, estado_material: 'subido' })
    .eq('id', id)
  if (error) return { error: 'No se pudo guardar el enlace.' }
  revalidatePath(`/servidores/${programa_id}`)
  return { success: true }
}

export async function crearRolServicio(data: {
  nombre: string
  descripcion?: string
  color?: string
  requiere_material?: boolean
}) {
  if (!data.nombre?.trim()) return { error: 'El nombre es obligatorio.' }
  const supabase = await createClient()
  const { error } = await supabase.from('roles_servicio').insert({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    color: data.color || '#6366f1',
    requiere_material: data.requiere_material ?? false,
  })
  if (error) return { error: 'No se pudo crear el rol.' }
  revalidatePath('/servidores/roles')
  return { success: true }
}

export async function calcularSugerenciaRotacion(programa_id: string) {
  const supabase = await createClient()

  // Roles del servicio
  const { data: roles } = await supabase
    .from('roles_servicio')
    .select('id, nombre')
    .order('nombre')

  if (!roles?.length) return { sugerencias: [] }

  // Personas activas con su última vez que sirvieron en cada rol
  const { data: personas } = await supabase
    .from('personas')
    .select('id, nombre_completo')
    .eq('estado', 'activo')

  if (!personas?.length) return { sugerencias: [] }

  // Historial reciente de asignaciones (últimos 20 programas)
  const { data: historial } = await supabase
    .from('programa_asignaciones')
    .select('persona_id, rol_servicio_id, programas(fecha)')
    .order('created_at', { ascending: false })
    .limit(300)

  // Roles ya asignados en este programa (no sugerir duplicados)
  const { data: yaAsignados } = await supabase
    .from('programa_asignaciones')
    .select('rol_servicio_id')
    .eq('programa_id', programa_id)

  const rolesYaAsignados = new Set((yaAsignados ?? []).map((a) => a.rol_servicio_id))

  // Para cada rol, encontrar la persona que lleva más tiempo sin servirlo
  const sugerencias = []
  for (const rol of roles) {
    if (rolesYaAsignados.has(rol.id)) continue

    // Mapa: persona_id → fecha de su última aparición en este rol
    const ultimaPorPersona: Record<string, string> = {}
    for (const h of historial ?? []) {
      if (h.rol_servicio_id !== rol.id) continue
      if (ultimaPorPersona[h.persona_id]) continue
      const prog = h.programas as unknown as { fecha: string } | null
      if (prog) ultimaPorPersona[h.persona_id] = prog.fecha
    }

    // Ordenar personas: primero las que nunca han servido, luego las más antiguas
    const ordenadas = [...personas].sort((a, b) => {
      const ua = ultimaPorPersona[a.id]
      const ub = ultimaPorPersona[b.id]
      if (!ua && !ub) return a.nombre_completo.localeCompare(b.nombre_completo)
      if (!ua) return -1
      if (!ub) return 1
      return ua < ub ? -1 : 1
    })

    const sugerida = ordenadas[0]
    if (sugerida) {
      sugerencias.push({
        rol_servicio_id: rol.id,
        rol_nombre: rol.nombre,
        persona_id: sugerida.id,
        persona_nombre: sugerida.nombre_completo,
        ultima_vez: ultimaPorPersona[sugerida.id] ?? null,
      })
    }
  }

  return { sugerencias }
}

export async function confirmarRotacion(
  programa_id: string,
  asignaciones: { rol_servicio_id: string; persona_id: string }[]
) {
  if (!asignaciones.length) return { error: 'Sin asignaciones a confirmar.' }

  const supabase = await createClient()
  const rows = asignaciones.map((a) => ({
    programa_id,
    rol_servicio_id: a.rol_servicio_id,
    persona_id: a.persona_id,
  }))

  const { error } = await supabase.from('programa_asignaciones').insert(rows)
  if (error) return { error: 'No se pudo guardar la rotación.' }

  revalidatePath(`/servidores/${programa_id}`)
  return { success: true }
}

export async function editarPrograma(id: string, data: {
  titulo: string
  fecha: string
  notas?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }

  const supabase = await createClient()
  const { error } = await supabase.from('programas').update({
    titulo: data.titulo.trim(),
    fecha: data.fecha,
    notas: data.notas?.trim() || null,
  }).eq('id', id)

  if (error) return { error: 'No se pudo actualizar el programa.' }
  revalidatePath('/servidores')
  revalidatePath(`/servidores/${id}`)
  return { success: true }
}

export async function aplicarRotacion(programa_id: string, rol_servicio_id: string) {
  const supabase = await createClient()

  const { data: config } = await supabase
    .from('rotacion_configuracion')
    .select('id, rotacion_miembros(persona_id, posicion)')
    .eq('rol_servicio_id', rol_servicio_id)
    .eq('activo', true)
    .single()

  if (!config) return { error: 'No hay rotación configurada para este rol.' }

  const miembros = (config.rotacion_miembros as { persona_id: string; posicion: number }[])
    .sort((a, b) => a.posicion - b.posicion)
    .filter((m) => m)

  if (!miembros.length) return { error: 'La rotación no tiene miembros.' }

  const { data: ultima } = await supabase
    .from('programa_asignaciones')
    .select('persona_id, programas(fecha)')
    .eq('rol_servicio_id', rol_servicio_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let siguiente = miembros[0]!
  if (ultima) {
    const idx = miembros.findIndex((m) => m.persona_id === ultima.persona_id)
    siguiente = miembros[(idx + 1) % miembros.length]!
  }

  await supabase.from('programa_asignaciones').insert({
    programa_id,
    rol_servicio_id,
    persona_id: siguiente.persona_id,
  })

  revalidatePath(`/servidores/${programa_id}`)
  return { success: true }
}
