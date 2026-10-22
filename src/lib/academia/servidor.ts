import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { hoyLima } from '@/lib/utils'
import { PUNTOS_ASISTENCIA, redondear, type EstadoAsistencia } from './reglas'

export async function personaActual() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).maybeSingle()
  return data ? { userId: user.id, personaId: data.persona_id as string } : null
}

export async function esLiderAcademia() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('tiene_permiso', { p_modulo: 'academia', p_accion: 'ver' })
  return data === true
}

export async function cursoDeSesion(admin: SupabaseClient, sesionId: string) {
  const { data } = await admin.from('sesiones').select('id, fecha, tema:temas(curso_id)').eq('id', sesionId).maybeSingle()
  if (!data) return null
  const tema = data.tema as unknown as { curso_id: string } | null
  return { fecha: data.fecha as string, cursoId: tema?.curso_id ?? null }
}

export async function estaInscrito(admin: SupabaseClient, cursoId: string, personaId: string) {
  const { data } = await admin.from('curso_inscripciones').select('id')
    .eq('curso_id', cursoId).eq('persona_id', personaId).eq('activo', true).maybeSingle()
  return !!data
}

// La asistencia pasa a "recuperada" solo si el alumno faltó, vio la grabación
// y un líder aprobó su resumen. Si el resumen deja de estar aprobado, vuelve a "ausente".
export async function evaluarRecuperacion(admin: SupabaseClient, sesionId: string, personaId: string) {
  const [{ data: asistencia }, { data: resumen }, { data: progreso }] = await Promise.all([
    admin.from('asistencias').select('estado').eq('sesion_id', sesionId).eq('persona_id', personaId).maybeSingle(),
    admin.from('resumenes_clase').select('estado').eq('sesion_id', sesionId).eq('persona_id', personaId).maybeSingle(),
    admin.from('grabacion_progreso').select('completado, visto_declarado').eq('sesion_id', sesionId).eq('persona_id', personaId).maybeSingle(),
  ])
  if (asistencia?.estado === 'presente') return

  const vioGrabacion = !!progreso && (progreso.completado || progreso.visto_declarado)
  const recupera = vioGrabacion && resumen?.estado === 'aprobado'
  const nuevo: EstadoAsistencia = recupera ? 'recuperada' : 'ausente'
  if (asistencia?.estado === nuevo || (!asistencia && !recupera)) return

  await admin.from('asistencias').upsert(
    { sesion_id: sesionId, persona_id: personaId, estado: nuevo, updated_at: new Date().toISOString() },
    { onConflict: 'sesion_id,persona_id' },
  )
}

const MINUTOS_DE_GRACIA = 30

// Un intento empezado y nunca enviado se cierra con 0 cuando vence su plazo.
export async function cerrarIntentosVencidos(admin: SupabaseClient, examenId: string, personaId?: string) {
  let q = admin.from('examen_intentos').select('id, persona_id, tipo').eq('examen_id', examenId).eq('estado', 'en_curso')
  if (personaId) q = q.eq('persona_id', personaId)
  const { data: abiertos } = await q
  if (!abiertos?.length) return

  const { data: examen } = await admin.from('examenes').select('fecha_limite').eq('id', examenId).single()
  const { data: habs } = await admin.from('examen_habilitaciones').select('persona_id, fecha_limite').eq('examen_id', examenId)
  const ahora = Date.now()
  const vencidos = abiertos.filter((i) => {
    const limite = i.tipo === 'recuperacion'
      ? habs?.find((h) => h.persona_id === i.persona_id)?.fecha_limite
      : examen?.fecha_limite
    return limite && ahora > new Date(limite).getTime() + MINUTOS_DE_GRACIA * 60 * 1000
  })
  if (vencidos.length) {
    await admin.from('examen_intentos')
      .update({ estado: 'calificado', puntaje: 0, nota: 0, enviado_en: new Date().toISOString() })
      .in('id', vencidos.map((v) => v.id))
  }
}

export interface FilaRanking {
  personaId: string
  nombre: string
  fotoUrl: string | null
  promedio: number | null
  examenesContados: number
  asistencia: number
  sesionesDictadas: number
  puesto: number
}

// Ordena por promedio (escala 20) y desempata por puntaje de asistencia (1 / 0.5 / 0).
export async function calcularRanking(admin: SupabaseClient, cursoId: string): Promise<FilaRanking[]> {
  const hoy = hoyLima()
  const ahora = new Date()
  const [{ data: inscritos }, { data: examenes }, { data: temas }] = await Promise.all([
    admin.from('curso_inscripciones')
      .select('persona_id, persona:personas!curso_inscripciones_persona_id_fkey(nombre_completo, foto_url)')
      .eq('curso_id', cursoId).eq('activo', true),
    admin.from('examenes').select('id, estado, fecha_limite').eq('curso_id', cursoId).neq('estado', 'borrador'),
    admin.from('temas').select('id').eq('curso_id', cursoId),
  ])

  const examIds = (examenes ?? []).map((e) => e.id)
  const temaIds = (temas ?? []).map((t) => t.id)
  const [{ data: intentos }, { data: sesiones }] = await Promise.all([
    examIds.length
      ? admin.from('examen_intentos').select('examen_id, persona_id, nota').in('examen_id', examIds).eq('estado', 'calificado')
      : Promise.resolve({ data: [] as { examen_id: string; persona_id: string; nota: number }[] }),
    temaIds.length
      ? admin.from('sesiones').select('id').in('tema_id', temaIds).lte('fecha', hoy)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ])
  const sesionIds = (sesiones ?? []).map((s) => s.id)
  const { data: asistencias } = sesionIds.length
    ? await admin.from('asistencias').select('persona_id, estado').in('sesion_id', sesionIds)
    : { data: [] as { persona_id: string; estado: EstadoAsistencia }[] }

  const mejor = new Map<string, number>()
  for (const i of intentos ?? []) {
    const k = `${i.persona_id}:${i.examen_id}`
    mejor.set(k, Math.max(mejor.get(k) ?? 0, Number(i.nota)))
  }

  const filas = (inscritos ?? []).map((ins) => {
    const persona = ins.persona as unknown as { nombre_completo: string; foto_url: string | null } | null
    let suma = 0, contados = 0
    for (const ex of examenes ?? []) {
      const nota = mejor.get(`${ins.persona_id}:${ex.id}`)
      const vencido = ex.estado === 'cerrado' || (ex.fecha_limite && new Date(ex.fecha_limite) < ahora)
      if (nota != null) { suma += nota; contados++ }
      else if (vencido) contados++
    }
    const asistencia = (asistencias ?? [])
      .filter((a) => a.persona_id === ins.persona_id)
      .reduce((s, a) => s + PUNTOS_ASISTENCIA[a.estado as EstadoAsistencia], 0)
    return {
      personaId: ins.persona_id as string,
      nombre: persona?.nombre_completo ?? '—',
      fotoUrl: persona?.foto_url ?? null,
      promedio: contados ? redondear(suma / contados) : null,
      examenesContados: contados,
      asistencia,
      sesionesDictadas: sesionIds.length,
      puesto: 0,
    }
  })

  filas.sort((a, b) => (b.promedio ?? -1) - (a.promedio ?? -1) || b.asistencia - a.asistencia)
  filas.forEach((f, i) => {
    const anterior = filas[i - 1]
    f.puesto = anterior && anterior.promedio === f.promedio && anterior.asistencia === f.asistencia ? anterior.puesto : i + 1
  })
  return filas
}
