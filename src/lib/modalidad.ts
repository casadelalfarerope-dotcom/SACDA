// Eventos presenciales, virtuales o mixtos.
export type Modalidad = 'presencial' | 'virtual' | 'mixto'
export interface DatosModalidad { modalidad: Modalidad; enlace_reunion: string; crear_meet: boolean }

// Validación común en el servidor.
export function limpiarModalidad(d: Partial<DatosModalidad>): { error?: string; datos?: DatosModalidad } {
  const modalidad: Modalidad = d.modalidad === 'virtual' || d.modalidad === 'mixto' ? d.modalidad : 'presencial'
  const enlace = modalidad === 'presencial' || d.crear_meet ? '' : (d.enlace_reunion ?? '').trim()
  if (enlace && !/^https?:\/\/\S+\.\S+/.test(enlace)) return { error: 'El enlace de la reunión debe empezar con https://' }
  return { datos: { modalidad, enlace_reunion: enlace, crear_meet: modalidad !== 'presencial' && !!d.crear_meet } }
}

export const modalidadBD = (d: DatosModalidad) => ({
  modalidad: d.modalidad, enlace_reunion: d.enlace_reunion || null, crear_meet: d.crear_meet,
})

// Enlace para entrar a la reunión de un día: el pegado a mano o el Meet que generó Google.
export async function enlaceDelDia(
  db: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  evento: { id: string; modalidad?: string | null; enlace_reunion?: string | null; crear_meet?: boolean | null },
  fechaOriginal: string | null,
): Promise<string | null> {
  if (!evento.modalidad || evento.modalidad === 'presencial') return null
  if (evento.enlace_reunion) return evento.enlace_reunion
  if (!evento.crear_meet || !fechaOriginal) return null
  const { data } = await db.from('google_sync').select('enlace_meet').eq('clave', `ev:${evento.id}:${fechaOriginal}`).maybeSingle()
  return (data?.enlace_meet as string | null) ?? null
}
