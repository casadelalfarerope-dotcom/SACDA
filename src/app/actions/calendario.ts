'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { enviarEmail, tplTareaAsignada } from '@/lib/email'
import { format, subDays } from 'date-fns'
import { integrantesMinisterio } from '@/lib/ministerios'
import { asegurarProgramas } from '@/lib/programas'

export async function crearEvento(data: {
  titulo: string
  descripcion?: string
  tipo: 'servicio' | 'actividad_especial' | 'evento_unico'
  hora_inicio?: string
  hora_fin?: string
  lugar?: string
  grupo_id?: string
  tipo_recurrencia: 'ninguna' | 'semanal' | 'mensual_por_dia' | 'anual'
  fecha_inicio_serie?: string
  dias_semana?: string[]
  semana_del_mes?: number
  dia_semana_mes?: string
  fecha_unica?: string
  requiere_diseno?: boolean
  dias_aviso_diseno?: number
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }

  if (data.tipo_recurrencia === 'ninguna' && !data.fecha_unica)
    return { error: 'Indica la fecha del evento.' }
  if (data.tipo_recurrencia === 'semanal' && (!data.dias_semana?.length || !data.fecha_inicio_serie))
    return { error: 'Indica los días y la fecha de inicio.' }
  if (data.tipo_recurrencia === 'mensual_por_dia' && (!data.semana_del_mes || !data.dia_semana_mes || !data.fecha_inicio_serie))
    return { error: 'Completa la configuración de recurrencia mensual.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: evento, error } = await supabase.from('eventos').insert({
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo,
    hora_inicio: data.hora_inicio || null,
    hora_fin: data.hora_fin || null,
    lugar: data.lugar?.trim() || null,
    grupo_id: data.grupo_id || null,
    tipo_recurrencia: data.tipo_recurrencia,
    fecha_inicio_serie: data.tipo_recurrencia !== 'ninguna' ? (data.fecha_inicio_serie || null) : null,
    dias_semana: data.tipo_recurrencia === 'semanal' ? data.dias_semana : null,
    semana_del_mes: data.tipo_recurrencia === 'mensual_por_dia' ? data.semana_del_mes : null,
    dia_semana_mes: data.tipo_recurrencia === 'mensual_por_dia' ? data.dia_semana_mes : null,
    fecha_unica: data.tipo_recurrencia === 'ninguna' ? data.fecha_unica : null,
    requiere_diseno: data.requiere_diseno ?? false,
    dias_aviso_diseno: data.dias_aviso_diseno ?? 7,
  }).select().single()

  if (error) return { error: 'No se pudo crear el evento.' }

  // Si requiere diseño y es evento con fecha única, crear tarea automáticamente
  if (data.requiere_diseno && data.fecha_unica) {
    await crearTareaDisenoPorEvento(evento.id, data.titulo.trim(), data.fecha_unica, data.dias_aviso_diseno ?? 7)
  }

  // Los programas de servidores siguen al calendario (cultos nuevos, cancelados o movidos).
  await asegurarProgramas(createServiceClient())
  revalidatePath('/calendario')
  revalidatePath('/servidores')
  return { success: true }
}

async function crearTareaDisenoPorEvento(
  eventoId: string,
  tituloEvento: string,
  fechaEvento: string,
  diasAviso: number
) {
  const admin = createServiceClient()

  // Fecha límite = fecha del evento − diasAviso
  const fechaLimite = format(subDays(new Date(fechaEvento), diasAviso), 'yyyy-MM-dd')

  // Se asigna al líder de Diseño Gráfico (o al primer integrante si no hay líder).
  const [disenador] = await integrantesMinisterio(admin, 'diseno')
  const asignadoId = disenador?.persona_id ?? null
  const asignadoEmail = disenador?.email ?? null
  const asignadoNombre = disenador?.nombre ?? null

  const { data: tarea } = await admin.from('tareas').insert({
    tipo: 'diseno',
    titulo: `Arte para ${tituloEvento}`,
    descripcion: `Diseño necesario para el evento del ${fechaEvento}. Fecha límite de entrega: ${fechaLimite}.`,
    asignado_id: asignadoId,
    evento_id: eventoId,
    fecha_limite: fechaLimite,
    estado: asignadoId ? 'en_progreso' : 'pendiente',
  }).select().single()

  if (!tarea) return

  // Vincular tarea al evento
  await admin.from('eventos').update({ tarea_diseno_id: tarea.id }).eq('id', eventoId)

  // Crear notificación in-app
  if (asignadoId) {
    await admin.from('notificaciones').insert({
      persona_id: asignadoId,
      tipo: 'tarea_asignada',
      titulo: 'Nueva tarea de diseño',
      cuerpo: `Se te asignó: "${tarea.titulo}". Fecha límite: ${fechaLimite}.`,
      url: `/tareas/${tarea.id}`,
    })
  }

  // Enviar email al diseñador
  if (asignadoEmail && asignadoNombre) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const { subject, html } = tplTareaAsignada(
      asignadoNombre,
      tarea.titulo,
      fechaLimite,
      `${appUrl}/tareas/${tarea.id}`
    )
    await enviarEmail(asignadoEmail, subject, html)
  }
}

export async function crearExcepcion(data: {
  evento_id: string
  fecha_original: string
  tipo_excepcion: 'cancelado' | 'reprogramado' | 'modificado'
  fecha_nueva?: string
  hora_nueva_inicio?: string
  titulo_override?: string
  notas?: string
}) {
  if (!data.evento_id || !data.fecha_original) return { error: 'Datos incompletos.' }
  if (data.tipo_excepcion === 'reprogramado' && !data.fecha_nueva) return { error: 'Elige la nueva fecha.' }
  if (data.tipo_excepcion === 'reprogramado' && data.fecha_nueva === data.fecha_original && !data.hora_nueva_inicio)
    return { error: 'La nueva fecha es la misma; cambia la fecha o la hora.' }

  const supabase = await createClient()
  const { error } = await supabase.from('evento_excepciones').upsert({
    evento_id: data.evento_id,
    fecha_original: data.fecha_original,
    tipo_excepcion: data.tipo_excepcion,
    fecha_nueva: data.fecha_nueva || null,
    hora_nueva_inicio: data.hora_nueva_inicio || null,
    titulo_override: data.titulo_override?.trim() || null,
    notas: data.notas?.trim() || null,
  }, { onConflict: 'evento_id,fecha_original' })

  if (error) return { error: 'No se pudo registrar la excepción.' }
  // Los programas de servidores siguen al calendario (cultos nuevos, cancelados o movidos).
  await asegurarProgramas(createServiceClient())
  revalidatePath('/calendario')
  revalidatePath('/servidores')
  return { success: true }
}

async function trasCambioDeCalendario() {
  // Los programas de servidores siguen al calendario (cultos nuevos, cancelados o movidos).
  await asegurarProgramas(createServiceClient())
  revalidatePath('/calendario', 'layout')
  revalidatePath('/servidores')
  revalidatePath('/mi', 'layout')
}

// Deshace el cambio de un día: vuelve a la fecha, hora y nombre normales.
export async function eliminarExcepcion(eventoId: string, fechaOriginal: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('evento_excepciones').delete()
    .eq('evento_id', eventoId).eq('fecha_original', fechaOriginal).select('id')
  if (error || !data?.length) return { error: 'No se pudo deshacer el cambio.' }
  await trasCambioDeCalendario()
  return { success: true }
}

// Edita la serie completa (o el evento único).
export async function editarEvento(id: string, data: {
  titulo: string
  descripcion?: string
  tipo: 'servicio' | 'actividad_especial' | 'evento_unico'
  hora_inicio?: string
  hora_fin?: string
  lugar?: string
  dias_semana?: string[]
  fecha_unica?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }
  if (data.hora_inicio && data.hora_fin && data.hora_fin <= data.hora_inicio) return { error: 'La hora de fin debe ser después de la de inicio.' }
  const supabase = await createClient()
  const { data: actual } = await supabase.from('eventos').select('tipo_recurrencia').eq('id', id).maybeSingle()
  if (!actual) return { error: 'Evento no encontrado.' }
  if (actual.tipo_recurrencia === 'semanal' && !data.dias_semana?.length) return { error: 'Elige al menos un día de la semana.' }
  if (actual.tipo_recurrencia === 'ninguna' && !data.fecha_unica) return { error: 'Indica la fecha del evento.' }

  const { data: filas, error } = await supabase.from('eventos').update({
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    tipo: data.tipo,
    hora_inicio: data.hora_inicio || null,
    hora_fin: data.hora_fin || null,
    lugar: data.lugar?.trim() || null,
    ...(actual.tipo_recurrencia === 'semanal' ? { dias_semana: data.dias_semana } : {}),
    ...(actual.tipo_recurrencia === 'ninguna' ? { fecha_unica: data.fecha_unica } : {}),
  }).eq('id', id).select('id')
  if (error || !filas?.length) return { error: 'No tienes permiso para editar este evento.' }
  await trasCambioDeCalendario()
  return { success: true }
}

// Quita la fecha de término: la serie vuelve a repetirse sin fin.
export async function reanudarSerie(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('eventos').update({ fecha_fin_serie: null }).eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo reanudar la serie.' }
  await trasCambioDeCalendario()
  return { success: true }
}

// La serie deja de repetirse después de esa fecha (los días anteriores quedan).
export async function terminarSerie(id: string, fechaFin: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaFin)) return { error: 'Elige la fecha del último día.' }
  const supabase = await createClient()
  const { data, error } = await supabase.from('eventos').update({ fecha_fin_serie: fechaFin }).eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo terminar la serie.' }
  await trasCambioDeCalendario()
  return { success: true }
}

export async function eliminarEvento(id: string) {
  const supabase = await createClient()
  const { data: permitido } = await supabase.rpc('tiene_permiso', { p_modulo: 'calendario', p_accion: 'eliminar' })
  if (permitido !== true) return { error: 'No tienes permiso para eliminar eventos.' }
  // Sus programas de servidores futuros se eliminan; los pasados quedan como historial.
  const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date())
  await createServiceClient().from('programas').delete().eq('evento_id', id).gte('fecha', hoy)
  const { data, error } = await supabase.from('eventos').delete().eq('id', id).select('id')
  if (error || !data?.length) return { error: 'No se pudo eliminar el evento.' }
  await trasCambioDeCalendario()
  return { success: true }
}
