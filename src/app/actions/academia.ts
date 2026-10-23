'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { esLiderAcademia, evaluarRecuperacion, personaActual } from '@/lib/academia/servidor'
import { DIAS_PARA_RENDIR, notaVigesimal } from '@/lib/academia/reglas'

type Resultado<T = object> = ({ success: true } & T) | { error: string }

async function notificar(personaIds: string[], titulo: string, cuerpo: string, url: string) {
  if (!personaIds.length) return
  await createServiceClient().from('notificaciones').insert(
    personaIds.map((persona_id) => ({ persona_id, tipo: 'general', titulo, cuerpo, url })),
  )
}

// ---------------- Cursos e inscripciones ----------------

export async function crearCurso(data: {
  nombre: string; descripcion?: string; profesor_id?: string; fecha_inicio?: string; fecha_fin?: string
}): Promise<Resultado<{ id: string }>> {
  if (!data.nombre?.trim()) return { error: 'El nombre del curso es obligatorio.' }
  const supabase = await createClient()
  const { data: curso, error } = await supabase.from('cursos').insert({
    nombre: data.nombre.trim(),
    descripcion: data.descripcion?.trim() || null,
    profesor_id: data.profesor_id || null,
    fecha_inicio: data.fecha_inicio || null,
    fecha_fin: data.fecha_fin || null,
  }).select('id').single()
  if (error || !curso) return { error: 'No se pudo crear el curso.' }
  revalidatePath('/academia')
  return { success: true, id: curso.id }
}

export async function cambiarEstadoCurso(id: string, estado: 'borrador' | 'activo' | 'finalizado'): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('cursos').update({ estado }).eq('id', id)
  if (error) return { error: 'No se pudo cambiar el estado.' }
  revalidatePath(`/academia/cursos/${id}`)
  revalidatePath('/academia')
  return { success: true }
}

export async function inscribirAlumnos(cursoId: string, personaIds: string[]): Promise<Resultado> {
  if (!personaIds.length) return { error: 'Selecciona al menos un alumno.' }
  const supabase = await createClient()
  const { error } = await supabase.from('curso_inscripciones').upsert(
    personaIds.map((persona_id) => ({ curso_id: cursoId, persona_id, activo: true })),
    { onConflict: 'curso_id,persona_id' },
  )
  if (error) return { error: 'No se pudo inscribir.' }

  revalidatePath(`/academia/cursos/${cursoId}`)
  return { success: true }
}

export async function retirarAlumno(cursoId: string, personaId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('curso_inscripciones').update({ activo: false })
    .eq('curso_id', cursoId).eq('persona_id', personaId)
  if (error) return { error: 'No se pudo retirar al alumno.' }
  revalidatePath(`/academia/cursos/${cursoId}`)
  return { success: true }
}

// ---------------- Temas, sesiones y materiales ----------------

export async function crearTema(cursoId: string, data: { titulo: string; resumen?: string }): Promise<Resultado<{ id: string }>> {
  if (!data.titulo?.trim()) return { error: 'El título del tema es obligatorio.' }
  const supabase = await createClient()
  const { count } = await supabase.from('temas').select('id', { count: 'exact', head: true }).eq('curso_id', cursoId)
  const { data: tema, error } = await supabase.from('temas').insert({
    curso_id: cursoId, titulo: data.titulo.trim(), resumen: data.resumen?.trim() || null, orden: (count ?? 0) + 1,
  }).select('id').single()
  if (error || !tema) return { error: 'No se pudo crear el tema.' }
  revalidatePath(`/academia/cursos/${cursoId}`)
  return { success: true, id: tema.id }
}

export async function editarTema(id: string, data: { titulo: string; resumen?: string }): Promise<Resultado> {
  if (!data.titulo?.trim()) return { error: 'El título del tema es obligatorio.' }
  const supabase = await createClient()
  const { error } = await supabase.from('temas')
    .update({ titulo: data.titulo.trim(), resumen: data.resumen?.trim() || null }).eq('id', id)
  if (error) return { error: 'No se pudo guardar el tema.' }
  revalidatePath(`/academia/temas/${id}`)
  return { success: true }
}

export async function crearSesion(temaId: string, data: {
  fecha: string; hora_inicio?: string; hora_fin?: string; enlace_reunion?: string; grabacion_url?: string
}): Promise<Resultado> {
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }
  const supabase = await createClient()
  const { error } = await supabase.from('sesiones').insert({
    tema_id: temaId,
    fecha: data.fecha,
    hora_inicio: data.hora_inicio || null,
    hora_fin: data.hora_fin || null,
    enlace_reunion: data.enlace_reunion?.trim() || null,
    grabacion_url: data.grabacion_url?.trim() || null,
  })
  if (error) return { error: 'No se pudo crear la sesión.' }
  revalidatePath(`/academia/temas/${temaId}`)
  return { success: true }
}

export async function editarSesion(id: string, data: {
  fecha: string; hora_inicio?: string; hora_fin?: string; enlace_reunion?: string; grabacion_url?: string
}): Promise<Resultado> {
  if (!data.fecha) return { error: 'La fecha es obligatoria.' }
  const supabase = await createClient()
  const { error } = await supabase.from('sesiones').update({
    fecha: data.fecha,
    hora_inicio: data.hora_inicio || null,
    hora_fin: data.hora_fin || null,
    enlace_reunion: data.enlace_reunion?.trim() || null,
    grabacion_url: data.grabacion_url?.trim() || null,
  }).eq('id', id)
  if (error) return { error: 'No se pudo guardar la sesión.' }
  revalidatePath(`/academia/sesiones/${id}`)
  return { success: true }
}

export async function eliminarSesion(id: string, temaId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('sesiones').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar la sesión.' }
  revalidatePath(`/academia/temas/${temaId}`)
  return { success: true }
}

export async function agregarMaterial(temaId: string, data: { titulo: string; url: string }): Promise<Resultado> {
  if (!data.titulo?.trim() || !data.url?.trim()) return { error: 'Escribe el título y el enlace.' }
  if (!/^https?:\/\//i.test(data.url.trim())) return { error: 'El enlace debe empezar con http:// o https://' }
  const supabase = await createClient()
  const { error } = await supabase.from('materiales').insert({ tema_id: temaId, titulo: data.titulo.trim(), url: data.url.trim() })
  if (error) return { error: 'No se pudo agregar el material.' }
  revalidatePath(`/academia/temas/${temaId}`)
  return { success: true }
}

export async function eliminarMaterial(id: string, temaId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('materiales').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar el material.' }
  revalidatePath(`/academia/temas/${temaId}`)
  return { success: true }
}

// ---------------- Asistencia y resúmenes ----------------

export async function marcarAsistencia(sesionId: string, personaId: string, estado: 'presente' | 'ausente'): Promise<Resultado> {
  const yo = await personaActual()
  const supabase = await createClient()
  const { error } = await supabase.from('asistencias').upsert(
    { sesion_id: sesionId, persona_id: personaId, estado, marcada_por: yo?.personaId ?? null, updated_at: new Date().toISOString() },
    { onConflict: 'sesion_id,persona_id' },
  )
  if (error) return { error: 'No se pudo guardar la asistencia.' }
  if (estado === 'ausente') await evaluarRecuperacion(createServiceClient(), sesionId, personaId)
  revalidatePath(`/academia/sesiones/${sesionId}`)
  return { success: true }
}

export async function revisarResumen(resumenId: string, estado: 'aprobado' | 'rechazado', comentario?: string): Promise<Resultado> {
  const yo = await personaActual()
  const supabase = await createClient()
  const { data: resumen, error } = await supabase.from('resumenes_clase').update({
    estado,
    comentario: comentario?.trim() || null,
    revisado_por: yo?.personaId ?? null,
    revisado_en: new Date().toISOString(),
  }).eq('id', resumenId).select('sesion_id, persona_id').single()
  if (error || !resumen) return { error: 'No se pudo guardar la revisión.' }

  await evaluarRecuperacion(createServiceClient(), resumen.sesion_id, resumen.persona_id)
  await notificar(
    [resumen.persona_id],
    estado === 'aprobado' ? 'Tu resumen fue aprobado' : 'Tu resumen necesita cambios',
    comentario?.trim() || (estado === 'aprobado' ? '¡Bien hecho!' : 'Revisa el comentario del líder y vuelve a enviarlo.'),
    `/taller/sesiones/${resumen.sesion_id}`,
  )
  revalidatePath(`/academia/sesiones/${resumen.sesion_id}`)
  return { success: true }
}

// ---------------- Exámenes ----------------

export interface PreguntaEditable {
  tipo: 'opcion_unica' | 'opcion_multiple' | 'verdadero_falso' | 'respuesta_corta' | 'parrafo'
  enunciado: string
  puntos: number
  opciones: { texto: string; es_correcta: boolean }[]
}

function validarPreguntas(preguntas: PreguntaEditable[]): string | null {
  if (!preguntas.length) return 'Agrega al menos una pregunta.'
  for (const [i, p] of preguntas.entries()) {
    const n = i + 1
    if (!p.enunciado.trim()) return `La pregunta ${n} no tiene enunciado.`
    if (!(p.puntos > 0)) return `La pregunta ${n} debe valer más de 0 puntos.`
    if (p.tipo === 'parrafo') continue
    const opciones = p.opciones.filter((o) => o.texto.trim())
    if (p.tipo === 'respuesta_corta') {
      if (!opciones.length) return `La pregunta ${n} necesita al menos una respuesta aceptada.`
      continue
    }
    if (opciones.length < 2) return `La pregunta ${n} necesita al menos dos opciones.`
    const correctas = opciones.filter((o) => o.es_correcta).length
    if (correctas === 0) return `Marca la respuesta correcta de la pregunta ${n}.`
    if (p.tipo !== 'opcion_multiple' && correctas > 1) return `La pregunta ${n} solo puede tener una respuesta correcta.`
  }
  return null
}

export async function crearExamen(cursoId: string, data: { titulo: string; tema_id?: string }): Promise<Resultado<{ id: string }>> {
  if (!data.titulo?.trim()) return { error: 'El título del examen es obligatorio.' }
  const supabase = await createClient()
  const { data: examen, error } = await supabase.from('examenes')
    .insert({ curso_id: cursoId, titulo: data.titulo.trim(), tema_id: data.tema_id || null })
    .select('id').single()
  if (error || !examen) return { error: 'No se pudo crear el examen.' }
  revalidatePath(`/academia/cursos/${cursoId}`)
  return { success: true, id: examen.id }
}

export async function guardarExamen(examenId: string, data: {
  titulo: string; descripcion?: string; tema_id?: string | null; preguntas: PreguntaEditable[]
}): Promise<Resultado> {
  if (!data.titulo?.trim()) return { error: 'El título del examen es obligatorio.' }
  const supabase = await createClient()
  const { count } = await supabase.from('examen_intentos').select('id', { count: 'exact', head: true }).eq('examen_id', examenId)
  if ((count ?? 0) > 0) return { error: 'Este examen ya tiene intentos de alumnos; no se pueden cambiar sus preguntas.' }

  const { error: e1 } = await supabase.from('examenes').update({
    titulo: data.titulo.trim(), descripcion: data.descripcion?.trim() || null, tema_id: data.tema_id || null,
  }).eq('id', examenId)
  if (e1) return { error: 'No se pudo guardar el examen.' }

  await supabase.from('examen_preguntas').delete().eq('examen_id', examenId)
  for (const [i, p] of data.preguntas.entries()) {
    const { data: pregunta, error } = await supabase.from('examen_preguntas').insert({
      examen_id: examenId, orden: i + 1, tipo: p.tipo, enunciado: p.enunciado.trim(), puntos: p.puntos,
    }).select('id').single()
    if (error || !pregunta) return { error: `No se pudo guardar la pregunta ${i + 1}.` }
    const opciones = p.tipo === 'parrafo' ? [] : p.opciones.filter((o) => o.texto.trim())
    if (opciones.length) {
      const { error: e2 } = await supabase.from('examen_opciones').insert(
        opciones.map((o, j) => ({ pregunta_id: pregunta.id, orden: j + 1, texto: o.texto.trim(), es_correcta: p.tipo === 'respuesta_corta' ? true : o.es_correcta })),
      )
      if (e2) return { error: `No se pudieron guardar las opciones de la pregunta ${i + 1}.` }
    }
  }
  revalidatePath(`/academia/examenes/${examenId}`)
  return { success: true }
}

export async function publicarExamen(examenId: string): Promise<Resultado> {
  const supabase = await createClient()
  const [{ data: examen }, { data: preguntas }] = await Promise.all([
    supabase.from('examenes').select('id, curso_id, titulo, estado').eq('id', examenId).single(),
    supabase.from('examen_preguntas').select('tipo, enunciado, puntos, examen_opciones(texto, es_correcta)').eq('examen_id', examenId),
  ])
  if (!examen) return { error: 'Examen no encontrado.' }
  if (examen.estado !== 'borrador') return { error: 'El examen ya fue publicado.' }
  const problema = validarPreguntas((preguntas ?? []).map((p) => ({
    tipo: p.tipo, enunciado: p.enunciado, puntos: Number(p.puntos),
    opciones: (p.examen_opciones ?? []) as { texto: string; es_correcta: boolean }[],
  })))
  if (problema) return { error: problema }

  const ahora = new Date()
  const limite = new Date(ahora.getTime() + DIAS_PARA_RENDIR * 24 * 60 * 60 * 1000)
  const { error } = await supabase.from('examenes').update({
    estado: 'publicado', publicado_en: ahora.toISOString(), fecha_limite: limite.toISOString(),
  }).eq('id', examenId)
  if (error) return { error: 'No se pudo publicar el examen.' }

  const { data: inscritos } = await supabase.from('curso_inscripciones').select('persona_id')
    .eq('curso_id', examen.curso_id).eq('activo', true)
  await notificar(
    (inscritos ?? []).map((i) => i.persona_id),
    'Nuevo examen disponible',
    `"${examen.titulo}". Tienes ${DIAS_PARA_RENDIR} días y hasta 3 intentos para rendirlo.`,
    `/taller/examenes/${examenId}`,
  )
  revalidatePath(`/academia/examenes/${examenId}`)
  return { success: true }
}

export async function cerrarExamen(examenId: string): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('examenes').update({ estado: 'cerrado' }).eq('id', examenId)
  if (error) return { error: 'No se pudo cerrar el examen.' }
  revalidatePath(`/academia/examenes/${examenId}`)
  return { success: true }
}

export async function configurarRecuperacion(examenId: string, permite: boolean): Promise<Resultado> {
  const supabase = await createClient()
  const { error } = await supabase.from('examenes').update({ permite_recuperacion: permite }).eq('id', examenId)
  if (error) return { error: 'No se pudo cambiar la configuración.' }
  revalidatePath(`/academia/examenes/${examenId}`)
  return { success: true }
}

export async function habilitarRecuperacion(examenId: string, personaId: string, dias: number): Promise<Resultado> {
  const yo = await personaActual()
  const supabase = await createClient()
  const { data: examen } = await supabase.from('examenes').select('titulo, permite_recuperacion').eq('id', examenId).single()
  if (!examen?.permite_recuperacion) return { error: 'Primero activa la recuperación para este examen.' }
  const limite = new Date(Date.now() + Math.max(1, dias) * 24 * 60 * 60 * 1000)
  const { error } = await supabase.from('examen_habilitaciones').upsert(
    { examen_id: examenId, persona_id: personaId, fecha_limite: limite.toISOString(), habilitado_por: yo?.personaId ?? null },
    { onConflict: 'examen_id,persona_id' },
  )
  if (error) return { error: 'No se pudo habilitar.' }
  await notificar([personaId], 'Examen de recuperación habilitado',
    `Puedes rendir "${examen.titulo}" una vez más. Tu nota máxima será 16/20.`, `/taller/examenes/${examenId}`)
  revalidatePath(`/academia/examenes/${examenId}`)
  return { success: true }
}

// Califica a mano las respuestas de tipo párrafo; cuando no queda ninguna pendiente,
// se calcula la nota final del intento.
export async function calificarRespuesta(respuestaId: string, puntos: number): Promise<Resultado> {
  if (!(await esLiderAcademia())) return { error: 'No tienes permiso para calificar.' }
  const admin = createServiceClient()
  const { data: resp } = await admin.from('examen_respuestas')
    .select('id, intento_id, pregunta:examen_preguntas(puntos)').eq('id', respuestaId).single()
  if (!resp) return { error: 'Respuesta no encontrada.' }
  const max = Number((resp.pregunta as unknown as { puntos: number }).puntos)
  if (!(puntos >= 0 && puntos <= max)) return { error: `El puntaje debe estar entre 0 y ${max}.` }

  const supabase = await createClient()
  const { error } = await supabase.from('examen_respuestas').update({ puntos }).eq('id', respuestaId)
  if (error) return { error: 'No se pudo calificar.' }

  const { data: todas } = await admin.from('examen_respuestas').select('puntos').eq('intento_id', resp.intento_id)
  if ((todas ?? []).every((r) => r.puntos != null)) {
    const { data: intento } = await admin.from('examen_intentos')
      .select('examen_id, persona_id, factor, puntaje_max').eq('id', resp.intento_id).single()
    if (intento) {
      const puntaje = (todas ?? []).reduce((s, r) => s + Number(r.puntos), 0)
      const nota = notaVigesimal(puntaje, Number(intento.puntaje_max), Number(intento.factor))
      await supabase.from('examen_intentos').update({ estado: 'calificado', puntaje, nota }).eq('id', resp.intento_id)
      await notificar([intento.persona_id], 'Tu examen fue calificado', `Tu nota es ${nota}/20.`, `/taller/examenes/${intento.examen_id}`)
    }
  }
  revalidatePath('/academia', 'layout')
  return { success: true }
}

export async function calificarRespuestaForm(respuestaId: string, datos: { puntos: string }): Promise<Resultado> {
  const puntos = Number(datos.puntos)
  if (datos.puntos === '' || Number.isNaN(puntos)) return { error: 'Escribe un puntaje.' }
  return calificarRespuesta(respuestaId, puntos)
}
