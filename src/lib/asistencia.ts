import type { SupabaseClient } from '@supabase/supabase-js'
import { generarInstancias, type EventoBase, type ExcepcionBase } from '@/lib/calendario'
import { hoyLima } from '@/lib/utils'

export interface DiaConLista {
  evento_id: string
  fecha: string          // día original de la serie (clave de la lista)
  fecha_real: string     // día en que se realiza (si se movió)
  titulo: string
  hora: string | null
}

function sumarDias(fecha: string, dias: number) {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Días de eventos con "tomar asistencia" entre dos fechas (sin los cancelados).
export async function diasConLista(db: SupabaseClient, desde: string, hasta: string): Promise<DiaConLista[]> {
  const { data: eventos } = await db.from('eventos')
    .select('id, titulo, tipo, hora_inicio, hora_fin, lugar, tipo_recurrencia, fecha_unica, fecha_inicio_serie, fecha_fin_serie, dias_semana, semana_del_mes, dia_semana_mes')
    .eq('requiere_asistencia', true).is('grupo_id', null) // los del ministerio tienen su propia lista
  if (!eventos?.length) return []
  const { data: excepciones } = await db.from('evento_excepciones')
    .select('evento_id, fecha_original, tipo_excepcion, fecha_nueva, titulo_override, hora_nueva_inicio')
    .in('evento_id', eventos.map((e) => e.id))
  const d = new Date(desde + 'T12:00:00Z'), h = new Date(hasta + 'T12:00:00Z')
  return eventos.flatMap((e) =>
    generarInstancias(e as EventoBase, ((excepciones ?? []) as (ExcepcionBase & { evento_id: string })[]).filter((x) => x.evento_id === e.id), d, h)
      .map((i) => ({ evento_id: e.id as string, fecha: i.fecha_original, fecha_real: i.fecha.toISOString().slice(0, 10), titulo: i.titulo, hora: i.hora_inicio })),
  ).sort((a, b) => (a.fecha_real + (a.hora ?? '')).localeCompare(b.fecha_real + (b.hora ?? '')))
}

// Cierra las listas de días ya pasados: quien no fue marcado como "vino" queda
// como ausencia por contactar. Si en un día nadie fue marcado, se asume que no
// se pasó lista y no se generan ausencias. Usa el cliente de servicio.
export async function cerrarListasPendientes(admin: SupabaseClient) {
  const hoy = hoyLima()
  const dias = (await diasConLista(admin, sumarDias(hoy, -21), sumarDias(hoy, -1))).filter((d) => d.fecha_real < hoy)
  if (!dias.length) return
  const { data: cierres } = await admin.from('asistencia_culto_cierres').select('evento_id, fecha')
    .in('evento_id', [...new Set(dias.map((d) => d.evento_id))])
  const cerrados = new Set((cierres ?? []).map((c) => `${c.evento_id}|${c.fecha}`))
  for (const d of dias.filter((x) => !cerrados.has(`${x.evento_id}|${x.fecha}`))) await cerrarLista(admin, d)
}

export async function cerrarLista(admin: SupabaseClient, dia: Pick<DiaConLista, 'evento_id' | 'fecha' | 'fecha_real'>) {
  const { data: vinieron } = await admin.from('asistencia_culto').select('persona_id').eq('evento_id', dia.evento_id).eq('fecha', dia.fecha)
  if (!vinieron?.length) return { generadas: 0, sinLista: true }
  const presentes = new Set(vinieron.map((v) => v.persona_id))
  const { data: activos } = await admin.from('personas').select('id').eq('estado', 'activo')
  const faltaron = (activos ?? []).filter((p) => !presentes.has(p.id))
  if (faltaron.length) {
    await admin.from('ausencias').upsert(
      faltaron.map((p) => ({ persona_id: p.id, fecha: dia.fecha_real, evento_id: dia.evento_id, estado: 'pendiente' })),
      { onConflict: 'evento_id,fecha,persona_id', ignoreDuplicates: true },
    )
  }
  await admin.from('asistencia_culto_cierres').upsert({ evento_id: dia.evento_id, fecha: dia.fecha })
  return { generadas: faltaron.length, sinLista: false }
}
