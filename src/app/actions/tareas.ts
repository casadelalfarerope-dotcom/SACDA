'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { enviarEmail, tplTareaAsignada, tplArteAprobado } from '@/lib/email'

export async function crearTarea(data: {
  tipo: string
  titulo: string
  descripcion?: string
  asignado_id?: string
  evento_id?: string
  fecha_limite?: string
}) {
  if (!data.titulo?.trim()) return { error: 'El título es obligatorio.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: tarea, error } = await supabase.from('tareas').insert({
    tipo: data.tipo,
    titulo: data.titulo.trim(),
    descripcion: data.descripcion?.trim() || null,
    asignado_id: data.asignado_id || null,
    evento_id: data.evento_id || null,
    fecha_limite: data.fecha_limite || null,
    solicitante_id: user.id,
    estado: data.asignado_id ? 'en_progreso' : 'pendiente',
  }).select().single()

  if (error) return { error: 'No se pudo crear la tarea.' }

  // Notificar al asignado si hay uno
  if (data.asignado_id && tarea) {
    await notificarAsignado(data.asignado_id, tarea.id, tarea.titulo, tarea.fecha_limite)
  }

  revalidatePath('/tareas')
  return { success: true, id: tarea.id }
}

async function notificarAsignado(personaId: string, tareaId: string, titulo: string, limite: string | null) {
  const admin = createServiceClient()

  await admin.from('notificaciones').insert({
    persona_id: personaId,
    tipo: 'tarea_asignada',
    titulo: 'Nueva tarea asignada',
    cuerpo: `Se te asignó: "${titulo}"${limite ? `. Fecha límite: ${limite}` : ''}.`,
    url: `/tareas/${tareaId}`,
  })

  const { data: persona } = await admin
    .from('personas').select('email, nombre_completo').eq('id', personaId).single()

  if (persona?.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const { subject, html } = tplTareaAsignada(
      persona.nombre_completo,
      titulo,
      limite,
      `${appUrl}/tareas/${tareaId}`
    )
    await enviarEmail(persona.email, subject, html)
  }
}

export async function entregarTarea(tarea_id: string, url_archivo: string, notas?: string) {
  if (!url_archivo?.trim()) return { error: 'El enlace del archivo es obligatorio.' }

  const supabase = await createClient()

  const { error: entErr } = await supabase.from('tarea_entregas').insert({
    tarea_id,
    url_archivo: url_archivo.trim(),
    notas: notas?.trim() || null,
  })
  if (entErr) return { error: 'No se pudo registrar la entrega.' }

  const { error: updErr } = await supabase.from('tareas')
    .update({ estado: 'entregado' })
    .eq('id', tarea_id)
  if (updErr) return { error: 'No se pudo actualizar el estado.' }

  revalidatePath(`/tareas/${tarea_id}`)
  revalidatePath('/tareas')
  return { success: true }
}

export async function aprobarTarea(tarea_id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: tarea } = await supabase
    .from('tareas')
    .select('tipo, titulo, asignado_id')
    .eq('id', tarea_id)
    .single()
  if (!tarea) return { error: 'Tarea no encontrada.' }

  const { error } = await supabase.from('tareas').update({
    estado: 'aprobado',
    aprobado_por: user.id,
    fecha_aprobacion: new Date().toISOString(),
  }).eq('id', tarea_id)
  if (error) return { error: 'No se pudo aprobar.' }

  // Post-aprobación para tareas de diseño: distribuir y notificar
  if (tarea.tipo === 'diseno') {
    const admin = createServiceClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const { data: ultima } = await admin
      .from('tarea_entregas')
      .select('url_archivo')
      .eq('tarea_id', tarea_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ultima) {
      await admin.from('tarea_distribuciones').insert([
        { tarea_id, destino: 'multimedia', url_archivo: ultima.url_archivo },
        { tarea_id, destino: 'impresiones', url_archivo: ultima.url_archivo },
      ])

      // Obtener emails/personas de los roles multimedia e impresiones
      for (const rolNombre of ['multimedia', 'impresiones']) {
        const { data: rol } = await admin.from('roles').select('id').eq('nombre', rolNombre).maybeSingle()
        if (!rol) continue

        const { data: asignados } = await admin
          .from('roles_asignados')
          .select('persona_id, persona:personas(email, nombre_completo)')
          .eq('rol_id', rol.id)
          .eq('activo', true)

        for (const ra of asignados ?? []) {
          const p = ra.persona as unknown as { email: string | null; nombre_completo: string } | null
          if (!p) continue

          // Notificación in-app
          await admin.from('notificaciones').insert({
            persona_id: ra.persona_id,
            tipo: 'arte_distribuido',
            titulo: 'Arte listo para usar',
            cuerpo: `El arte "${tarea.titulo}" fue aprobado y está disponible para ${rolNombre}.`,
            url: `/tareas/${tarea_id}`,
          })

          // Email
          if (p.email) {
            const { subject, html } = tplArteAprobado(
              rolNombre as 'multimedia' | 'impresiones',
              tarea.titulo,
              ultima.url_archivo,
              `${appUrl}/tareas/${tarea_id}`
            )
            await enviarEmail(p.email, subject, html)
          }
        }
      }
    }

    // Notificar al diseñador que su trabajo fue aprobado
    if (tarea.asignado_id) {
      await admin.from('notificaciones').insert({
        persona_id: tarea.asignado_id,
        tipo: 'tarea_aprobada',
        titulo: 'Tu diseño fue aprobado',
        cuerpo: `"${tarea.titulo}" fue aprobado y distribuido a Multimedia e Impresiones.`,
        url: `/tareas/${tarea_id}`,
      })
    }
  }

  revalidatePath(`/tareas/${tarea_id}`)
  revalidatePath('/tareas')
  return { success: true }
}

export async function rechazarTarea(tarea_id: string, feedback: string) {
  if (!feedback?.trim()) return { error: 'El motivo de rechazo es obligatorio.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: tarea } = await supabase
    .from('tareas').select('asignado_id, titulo').eq('id', tarea_id).single()

  const { error } = await supabase.from('tareas').update({
    estado: 'rechazado',
    aprobado_por: user.id,
    feedback_rechazo: feedback.trim(),
  }).eq('id', tarea_id)
  if (error) return { error: 'No se pudo rechazar.' }

  // Notificar al diseñador del rechazo
  if (tarea?.asignado_id) {
    const admin = createServiceClient()
    await admin.from('notificaciones').insert({
      persona_id: tarea.asignado_id,
      tipo: 'tarea_rechazada',
      titulo: 'Tu diseño fue rechazado',
      cuerpo: `"${tarea.titulo}" fue rechazado. Motivo: ${feedback.trim()}`,
      url: `/tareas/${tarea_id}`,
    })
  }

  revalidatePath(`/tareas/${tarea_id}`)
  revalidatePath('/tareas')
  return { success: true }
}

export async function confirmarDistribucion(id: string, tarea_id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tarea_distribuciones').update({ confirmado: true }).eq('id', id)
  if (error) return { error: 'No se pudo confirmar.' }
  revalidatePath(`/tareas/${tarea_id}`)
  return { success: true }
}
