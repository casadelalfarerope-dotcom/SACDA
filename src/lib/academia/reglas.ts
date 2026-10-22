export const NOTA_MAXIMA = 20
export const MAX_INTENTOS = 3
export const FACTOR_POR_INTENTO = [1, 0.9, 0.8] as const
export const FACTOR_RECUPERACION = 0.8
export const DIAS_PARA_RENDIR = 7
export const PORCENTAJE_VIDEO_COMPLETO = 0.95

export type EstadoAsistencia = 'presente' | 'ausente' | 'recuperada'
export const PUNTOS_ASISTENCIA: Record<EstadoAsistencia, number> = { presente: 1, recuperada: 0.5, ausente: 0 }

export interface IntentoResumen {
  numero: number
  tipo: 'normal' | 'recuperacion'
  estado: 'en_curso' | 'en_revision' | 'calificado'
  nota: number | null
}

export const redondear = (n: number) => Math.round(n * 100) / 100

export function notaVigesimal(puntaje: number, puntajeMax: number, factor: number) {
  if (puntajeMax <= 0) return 0
  return redondear((puntaje / puntajeMax) * NOTA_MAXIMA * factor)
}

export const notaTope = (factor: number) => redondear(NOTA_MAXIMA * factor)

export function mejorNota(intentos: IntentoResumen[]): number | null {
  const notas = intentos.filter((i) => i.estado === 'calificado' && i.nota != null).map((i) => Number(i.nota))
  return notas.length ? Math.max(...notas) : null
}

export type Disponibilidad =
  | { tipo: 'continuar'; numero: number }
  | { tipo: 'nuevo'; intento: 'normal' | 'recuperacion'; numero: number; factor: number }
  | { tipo: 'bloqueado'; motivo: string }

// Decide si el alumno puede rendir y con qué tope. Solo se permite un intento
// más si su tope puede superar la mejor nota actual.
export function disponibilidadExamen(params: {
  estadoExamen: 'borrador' | 'publicado' | 'cerrado'
  fechaLimite: string | null
  permiteRecuperacion: boolean
  habilitacionHasta: string | null
  intentos: IntentoResumen[]
  ahora?: Date
}): Disponibilidad {
  const ahora = params.ahora ?? new Date()
  const enCurso = params.intentos.find((i) => i.estado === 'en_curso')
  if (enCurso) return { tipo: 'continuar', numero: enCurso.numero }

  if (params.intentos.some((i) => i.estado === 'en_revision')) {
    return { tipo: 'bloqueado', motivo: 'Tu último intento está en revisión. Espera la calificación del líder.' }
  }

  const mejor = mejorNota(params.intentos) ?? -1
  const normales = params.intentos.filter((i) => i.tipo === 'normal')
  const dentroDelPlazo =
    params.estadoExamen === 'publicado' && !!params.fechaLimite && ahora <= new Date(params.fechaLimite)

  if (dentroDelPlazo && normales.length < MAX_INTENTOS) {
    const factor = FACTOR_POR_INTENTO[normales.length]!
    if (mejor < notaTope(factor)) {
      return { tipo: 'nuevo', intento: 'normal', numero: normales.length + 1, factor }
    }
    return {
      tipo: 'bloqueado',
      motivo: `Tu mejor nota (${mejor}/20) ya es igual o mayor que lo máximo que podrías sacar en el siguiente intento (${notaTope(factor)}/20).`,
    }
  }

  const yaRecupero = params.intentos.some((i) => i.tipo === 'recuperacion')
  const habilitado =
    params.permiteRecuperacion && !!params.habilitacionHasta && ahora <= new Date(params.habilitacionHasta)
  if (habilitado && !yaRecupero && mejor < notaTope(FACTOR_RECUPERACION)) {
    return { tipo: 'nuevo', intento: 'recuperacion', numero: 1, factor: FACTOR_RECUPERACION }
  }

  if (params.estadoExamen === 'borrador') return { tipo: 'bloqueado', motivo: 'Este examen aún no está publicado.' }
  if (yaRecupero) return { tipo: 'bloqueado', motivo: 'Ya rendiste tu examen de recuperación.' }
  if (normales.length >= MAX_INTENTOS) return { tipo: 'bloqueado', motivo: 'Ya usaste tus 3 intentos.' }
  return { tipo: 'bloqueado', motivo: 'El plazo para rendir este examen terminó.' }
}

export function normalizarTexto(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Une tramos [inicio, fin] en segundos y devuelve los tramos fusionados y el total visto.
export function fusionarTramos(tramos: [number, number][], duracion: number) {
  const limpios = tramos
    .map(([a, b]) => [Math.max(0, Math.min(a, b)), Math.min(duracion, Math.max(a, b))] as [number, number])
    .filter(([a, b]) => b > a)
    .sort((x, y) => x[0] - y[0])
  const fusionados: [number, number][] = []
  for (const t of limpios) {
    const ultimo = fusionados[fusionados.length - 1]
    if (ultimo && t[0] <= ultimo[1] + 1) ultimo[1] = Math.max(ultimo[1], t[1])
    else fusionados.push([t[0], t[1]])
  }
  const total = fusionados.reduce((s, [a, b]) => s + (b - a), 0)
  return { tramos: fusionados, total: Math.round(total) }
}
