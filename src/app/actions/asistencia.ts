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
