'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { enviarEmail, tplTareaAsignada } from '@/lib/email'
import { format, subDays } from 'date-fns'

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

  revalidatePath('/calendario')
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

  // Buscar a alguien con rol diseñador para asignar
  const { data: roles } = await admin
    .from('roles').select('id').eq('nombre', 'diseniador').maybeSingle()

  let asignadoId: string | null = null
  let asignadoEmail: string | null = null
  let asignadoNombre: string | null = null

  if (roles) {
    const { data: asignados } = await admin
      .from('roles_asignados')
      .select('persona_id, persona:personas(nombre_completo, email)')
      .eq('rol_id', roles.id)
      .eq('activo', true)
      .limit(1)
      .single()

    if (asignados) {
      asignadoId = asignados.persona_id
      const p = asignados.persona as unknown as { nombre_completo: string; email: string | null } | null
      asignadoEmail = p?.email ?? null
      asignadoNombre = p?.nombre_completo ?? null
    }
  }

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
  revalidatePath('/calendario')
  return { success: true }
}
