'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { cerrarIntentosVencidos, cursoDeSesion, estaInscrito, evaluarRecuperacion, personaActual } from '@/lib/academia/servidor'
import {
  disponibilidadExamen, fusionarTramos, normalizarTexto, notaVigesimal,
  PORCENTAJE_VIDEO_COMPLETO, type IntentoResumen,
} from '@/lib/academia/reglas'
import { tipoGrabacion } from '@/lib/academia/grabacion'

type Resultado<T = object> = ({ success: true } & T) | { error: string }

async function alumnoDeSesion(sesionId: string) {
  const yo = await personaActual()
  if (!yo) return null
  const admin = createServiceClient()
  const sesion = await cursoDeSesion(admin, sesionId)
  if (!sesion?.cursoId || !(await estaInscrito(admin, sesion.cursoId, yo.personaId))) return null
  return { admin, personaId: yo.personaId, cursoId: sesion.cursoId }
}

// ---------------- Grabaciones y resúmenes ----------------

export async function registrarProgreso(sesionId: string, tramos: [number, number][], duracion: number): Promise<Resultado<{ porcentaje: number }>> {
  const ctx = await alumnoDeSesion(sesionId)
  if (!ctx) return { error: 'No tienes acceso a esta clase.' }
  if (!(duracion > 0)) return { error: 'Duración inválida.' }
  const { admin, personaId } = ctx

  const { data: previo } = await admin.from('grabacion_progreso').select('tramos, completado')
    .eq('sesion_id', sesionId).eq('persona_id', personaId).maybeSingle()
  const { tramos: fusionados, total } = fusionarTramos([...((previo?.tramos as [number, number][]) ?? []), ...tramos], duracion)
  const completado = previo?.completado || total >= duracion * PORCENTAJE_VIDEO_COMPLETO

  await admin.from('grabacion_progreso').upsert({
    sesion_id: sesionId, persona_id: personaId, duracion_seg: Math.round(duracion),
    tramos: fusionados, segundos_vistos: total, completado, updated_at: new Date().toISOString(),
  }, { onConflict: 'sesion_id,persona_id' })

  if (completado && !previo?.completado) {
    await evaluarRecuperacion(admin, sesionId, personaId)
    revalidatePath(`/taller/sesiones/${sesionId}`)
  }
  return { success: true, porcentaje: Math.min(100, Math.round((total / duracion) * 100)) }
}

// Solo para enlaces donde no se puede medir cuánto se vio (Drive, OneDrive, etc.).
export async function declararVisto(sesionId: string): Promise<Resultado> {
  const ctx = await alumnoDeSesion(sesionId)
  if (!ctx) return { error: 'No tienes acceso a esta clase.' }
  const { data: sesion } = await ctx.admin.from('sesiones').select('grabacion_url').eq('id', sesionId).single()
  if (!sesion?.grabacion_url) return { error: 'Esta clase aún no tiene grabación.' }
  if (tipoGrabacion(sesion.grabacion_url) !== 'externa') return { error: 'Esta grabación registra tu avance automáticamente.' }

  await ctx.admin.from('grabacion_progreso').upsert({
    sesion_id: sesionId, persona_id: ctx.personaId, visto_declarado: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'sesion_id,persona_id' })
  await evaluarRecuperacion(ctx.admin, sesionId, ctx.personaId)
  revalidatePath(`/taller/sesiones/${sesionId}`)
  return { success: true }
}

export async function enviarResumen(sesionId: string, texto: string): Promise<Resultado> {
  const limpio = texto.trim()
  if (limpio.length < 80) return { error: 'Tu resumen debe tener al menos 80 caracteres.' }
  const ctx = await alumnoDeSesion(sesionId)
  if (!ctx) return { error: 'No tienes acceso a esta clase.' }
  const { admin, personaId, cursoId } = ctx

  const { data: previo } = await admin.from('resumenes_clase').select('estado')
    .eq('sesion_id', sesionId).eq('persona_id', personaId).maybeSingle()
  if (previo?.estado === 'aprobado') return { error: 'Tu resumen ya fue aprobado.' }

  const { error } = await admin.from('resumenes_clase').upsert({
    sesion_id: sesionId, persona_id: personaId, texto: limpio, estado: 'pendiente',
    comentario: null, revisado_por: null, revisado_en: null,
  }, { onConflict: 'sesion_id,persona_id' })
  if (error) return { error: 'No se pudo enviar el resumen.' }

  const { data: curso } = await admin.from('cursos').select('profesor_id, nombre').eq('id', cursoId).single()
  if (curso?.profesor_id) {
    await admin.from('notificaciones').insert({
      persona_id: curso.profesor_id, tipo: 'general', titulo: 'Nuevo resumen por revisar',
      cuerpo: `Un alumno de "${curso.nombre}" envió su resumen de clase.`, url: `/academia/sesiones/${sesionId}`,
    })
  }
  revalidatePath(`/taller/sesiones/${sesionId}`)
  return { success: true }
}

// ---------------- Exámenes ----------------

async function contextoExamen(examenId: string) {
  const yo = await personaActual()
  if (!yo) return null
  const admin = createServiceClient()
  const { data: examen } = await admin.from('examenes')
    .select('id, curso_id, estado, fecha_limite, permite_recuperacion').eq('id', examenId).maybeSingle()
  if (!examen || examen.estado === 'borrador' || !(await estaInscrito(admin, examen.curso_id, yo.personaId))) return null
  await cerrarIntentosVencidos(admin, examenId, yo.personaId)
  const [{ data: intentos }, { data: hab }] = await Promise.all([
    admin.from('examen_intentos').select('id, numero, tipo, estado, nota, iniciado_en').eq('examen_id', examenId).eq('persona_id', yo.personaId),
    admin.from('examen_habilitaciones').select('fecha_limite').eq('examen_id', examenId).eq('persona_id', yo.personaId).maybeSingle(),
  ])
  return { admin, personaId: yo.personaId, examen, intentos: intentos ?? [], habilitacionHasta: hab?.fecha_limite ?? null }
}

export async function iniciarIntento(examenId: string): Promise<Resultado<{ intentoId: string }>> {
  const ctx = await contextoExamen(examenId)
  if (!ctx) return { error: 'No tienes acceso a este examen.' }
  const disp = disponibilidadExamen({
    estadoExamen: ctx.examen.estado, fechaLimite: ctx.examen.fecha_limite, permiteRecuperacion: ctx.examen.permite_recuperacion,
    habilitacionHasta: ctx.habilitacionHasta, intentos: ctx.intentos as IntentoResumen[],
  })
  if (disp.tipo === 'continuar') {
    const actual = ctx.intentos.find((i) => i.estado === 'en_curso')!
    return { success: true, intentoId: actual.id }
  }
  if (disp.tipo === 'bloqueado') return { error: disp.motivo }

  const { data: preguntas } = await ctx.admin.from('examen_preguntas').select('puntos').eq('examen_id', examenId)
  const puntajeMax = (preguntas ?? []).reduce((s, p) => s + Number(p.puntos), 0)
  const { data: intento, error } = await ctx.admin.from('examen_intentos').insert({
    examen_id: examenId, persona_id: ctx.personaId, numero: disp.numero, tipo: disp.intento,
    factor: disp.factor, puntaje_max: puntajeMax,
  }).select('id').single()
  if (error || !intento) return { error: 'No se pudo iniciar el intento.' }
  return { success: true, intentoId: intento.id }
}

const MINUTOS_DE_GRACIA = 30

export async function enviarIntento(
  intentoId: string,
  respuestas: { pregunta_id: string; opciones: string[]; texto?: string }[],
): Promise<Resultado<{ estado: 'calificado' | 'en_revision'; nota: number | null }>> {
  const yo = await personaActual()
  if (!yo) return { error: 'No autenticado.' }
  const admin = createServiceClient()
  const { data: intento } = await admin.from('examen_intentos')
    .select('id, examen_id, persona_id, tipo, estado, factor, iniciado_en, puntaje_max').eq('id', intentoId).single()
  if (!intento || intento.persona_id !== yo.personaId) return { error: 'Intento no encontrado.' }
  if (intento.estado !== 'en_curso') return { error: 'Este intento ya fue enviado.' }

  const { data: examen } = await admin.from('examenes').select('fecha_limite').eq('id', intento.examen_id).single()
  let limite = examen?.fecha_limite ? new Date(examen.fecha_limite) : null
  if (intento.tipo === 'recuperacion') {
    const { data: hab } = await admin.from('examen_habilitaciones').select('fecha_limite')
      .eq('examen_id', intento.examen_id).eq('persona_id', yo.personaId).maybeSingle()
    limite = hab ? new Date(hab.fecha_limite) : null
  }
  if (!limite || Date.now() > limite.getTime() + MINUTOS_DE_GRACIA * 60 * 1000) {
    return { error: 'El plazo para enviar este examen terminó.' }
  }

  const { data: preguntas } = await admin.from('examen_preguntas')
    .select('id, tipo, puntos, examen_opciones(id, texto, es_correcta)').eq('examen_id', intento.examen_id)
  const porPregunta = new Map(respuestas.map((r) => [r.pregunta_id, r]))

  let puntaje = 0
  let pendientes = 0
  const filas = (preguntas ?? []).map((p) => {
    const r = porPregunta.get(p.id)
    const opciones = (p.examen_opciones ?? []) as { id: string; texto: string; es_correcta: boolean }[]
    const elegidas = (r?.opciones ?? []).filter((id) => opciones.some((o) => o.id === id))
    const texto = r?.texto?.trim() || null
    let puntos: number | null = 0
    if (p.tipo === 'parrafo') {
      puntos = texto ? null : 0
      if (texto) pendientes++
    } else if (p.tipo === 'respuesta_corta') {
      const ok = !!texto && opciones.some((o) => normalizarTexto(o.texto) === normalizarTexto(texto))
      puntos = ok ? Number(p.puntos) : 0
    } else {
      const correctas = opciones.filter((o) => o.es_correcta).map((o) => o.id).sort()
      const ok = elegidas.length === correctas.length && [...elegidas].sort().every((id, i) => id === correctas[i])
      puntos = ok ? Number(p.puntos) : 0
    }
    if (puntos) puntaje += puntos
    return { intento_id: intentoId, pregunta_id: p.id, opciones: elegidas, texto, puntos }
  })

  const { error: e1 } = await admin.from('examen_respuestas').insert(filas)
  if (e1) return { error: 'No se pudieron guardar tus respuestas.' }

  const estado = pendientes ? 'en_revision' : 'calificado'
  const nota = pendientes ? null : notaVigesimal(puntaje, Number(intento.puntaje_max), Number(intento.factor))
  await admin.from('examen_intentos').update({
    estado, enviado_en: new Date().toISOString(), puntaje, nota,
  }).eq('id', intentoId)

  revalidatePath(`/taller/examenes/${intento.examen_id}`)
  return { success: true, estado, nota }
}
