'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { cerrarLista } from '@/lib/asistencia'

const FECHA = /^\d{4}-\d{2}-\d{2}$/

// Marca (o desmarca) que una persona vino a un culto. Si la lista ya se había
// cerrado y tenía una ausencia sin motivo, esa ausencia se quita.
export async function marcarVino(eventoId: string, fecha: string, personaId: string, vino: boolean) {
  if (!FECHA.test(fecha)) return { error: 'Fecha no válida.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()

  if (vino) {
    const { error } = await supabase.from('asistencia_culto').upsert(
      { evento_id: eventoId, fecha, persona_id: personaId, marcado_por: cuenta?.persona_id ?? null },
      { onConflict: 'evento_id,fecha,persona_id', ignoreDuplicates: true },
    )
    if (error) return { error: error.code === '42501' ? 'No tienes permiso para pasar lista.' : 'No se pudo guardar.' }
    await supabase.from('ausencias').delete().eq('evento_id', eventoId).eq('persona_id', personaId)
      .eq('estado', 'pendiente').is('motivo', null)
    // Si es una persona nueva y vuelve otro día, se registra que volvió.
    await supabase.from('seguimiento_visitas').update({ volvio: true })
      .eq('persona_id', personaId).eq('volvio', false).lt('fecha_primera_visita', fecha)
  } else {
    const { error } = await supabase.from('asistencia_culto').delete().eq('evento_id', eventoId).eq('fecha', fecha).eq('persona_id', personaId)
    if (error) return { error: 'No se pudo guardar.' }
  }
  revalidatePath('/miembros', 'layout')
  return { success: true }
}

// Cierra la lista del día: quienes no vinieron pasan a ausencias por contactar.
export async function cerrarListaAhora(eventoId: string, fecha: string, fechaReal: string) {
  if (!FECHA.test(fecha) || !FECHA.test(fechaReal)) return { error: 'Fecha no válida.' }
  const supabase = await createClient()
  const { data: permitido } = await supabase.rpc('tiene_permiso', { p_modulo: 'miembros', p_accion: 'crear' })
  if (permitido !== true) return { error: 'No tienes permiso para cerrar la lista.' }
  const res = await cerrarLista(createServiceClient(), { evento_id: eventoId, fecha, fecha_real: fechaReal })
  if (res.sinLista) return { error: 'Marca al menos a una persona antes de cerrar la lista.' }
  revalidatePath('/miembros', 'layout')
  return { success: true, generadas: res.generadas }
}

// Anota o cambia el motivo de una ausencia.
export async function guardarMotivoAusencia(id: string, motivo: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ausencias').update({ motivo: motivo.trim() || null }).eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo guardar el motivo.' }
  revalidatePath('/miembros', 'layout')
  return { success: true }
}

// Persona que viene por primera vez: se crea su ficha (estado "visita"), su
// seguimiento de nuevo y queda marcada como que vino a este culto.
export async function registrarPersonaNueva(eventoId: string, fecha: string, fechaReal: string, datos: { nombre: string; telefono?: string; invitado_por?: string }) {
  const nombre = datos.nombre.trim().replace(/\s+/g, ' ')
  if (nombre.length < 3) return { error: 'Escribe el nombre completo.' }
  if (!FECHA.test(fecha) || !FECHA.test(fechaReal)) return { error: 'Fecha no válida.' }
  const telefono = datos.telefono?.trim() || null
  if (telefono && !/^[+\d\s()-]{6,20}$/.test(telefono)) return { error: 'El teléfono solo puede tener números, espacios y el signo +.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()

  const { data: persona, error } = await supabase.from('personas')
    .insert({ nombre_completo: nombre, telefono, estado: 'visita' }).select('id, nombre_completo').single()
  if (error || !persona) return { error: error?.code === '42501' ? 'No tienes permiso para registrar personas.' : 'No se pudo registrar a la persona.' }

  await Promise.all([
    supabase.from('seguimiento_visitas').insert({
      persona_id: persona.id, fecha_primera_visita: fechaReal, referido_por: datos.invitado_por || null, estado: 'pendiente', volvio: false,
    }),
    supabase.from('asistencia_culto').insert({ evento_id: eventoId, fecha, persona_id: persona.id, marcado_por: cuenta?.persona_id ?? null }),
  ])
  revalidatePath('/miembros', 'layout')
  revalidatePath('/congregantes')
  return { success: true, persona: { id: persona.id as string, nombre: persona.nombre_completo as string } }
}

// ---------- Visitas pastorales ----------

export async function programarVisita(datos: { persona_id: string; fecha: string; responsable_id?: string; motivo?: string; ausencia_id?: string }) {
  if (!datos.persona_id) return { error: 'Falta la persona.' }
  if (!FECHA.test(datos.fecha)) return { error: 'Elige la fecha de la visita.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()
  const { data: visita, error } = await supabase.from('visitas_pastorales').insert({
    persona_id: datos.persona_id, fecha: datos.fecha, responsable_id: datos.responsable_id || null,
    motivo: datos.motivo?.trim() || null, ausencia_id: datos.ausencia_id || null, creado_por: cuenta?.persona_id ?? null,
  }).select('id, persona:personas!visitas_pastorales_persona_id_fkey(nombre_completo)').single()
  if (error || !visita) return { error: error?.code === '42501' ? 'No tienes permiso para programar visitas.' : 'No se pudo programar la visita.' }

  if (datos.responsable_id && datos.responsable_id !== cuenta?.persona_id) {
    const nombre = (visita.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? 'un hermano'
    await createServiceClient().from('notificaciones').insert({
      persona_id: datos.responsable_id, tipo: 'general', titulo: 'Te asignaron una visita',
      cuerpo: `Visitar a ${nombre} el ${datos.fecha.slice(8, 10)}/${datos.fecha.slice(5, 7)}.${datos.motivo ? ` Motivo: ${datos.motivo}` : ''}`,
      url: '/miembros/visitas-pastorales',
    })
  }
  revalidatePath('/miembros', 'layout')
  return { success: true }
}

export async function actualizarVisitaPastoral(id: string, estado: 'programada' | 'realizada' | 'cancelada', nota?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('visitas_pastorales')
    .update({ estado, ...(nota !== undefined ? { nota: nota.trim() || null } : {}) }).eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo actualizar la visita.' }
  revalidatePath('/miembros', 'layout')
  revalidatePath('/mi', 'layout')
  return { success: true }
}
