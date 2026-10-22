const TIPO_APORTE: Record<string, string> = {
  ofrenda: 'Ofrenda', diezmo: 'Diezmo', pacto: 'Pacto', otro: 'Otro',
}

export const CATEGORIAS_GASTO = [
  { value: 'local',       label: 'Local' },
  { value: 'equipos',     label: 'Equipos' },
  { value: 'actividades', label: 'Actividades' },
  { value: 'personal',    label: 'Personal' },
  { value: 'servicios',   label: 'Servicios' },
  { value: 'otros',       label: 'Otros' },
]

const CATEGORIA_BIEN: Record<string, string> = {
  instrumento: 'Instrumento', equipo_audio: 'Equipo de audio', equipo_video: 'Equipo de video',
  mobiliario: 'Mobiliario', otro: 'Otro',
}

const ESTADO_BIEN: Record<string, string> = {
  bueno: 'Bueno', regular: 'Regular', malo: 'Malo', baja: 'De baja', en_reparacion: 'En reparación',
}

function capitalizar(s: string) {
  const t = s.replace(/_/g, ' ')
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const etiquetaTipoAporte = (v: string) => TIPO_APORTE[v] ?? capitalizar(v)
export const etiquetaCategoriaGasto = (v: string) =>
  CATEGORIAS_GASTO.find((c) => c.value === v)?.label ?? capitalizar(v)
export const etiquetaCategoriaBien = (v: string | null) => (v ? CATEGORIA_BIEN[v] ?? capitalizar(v) : 'Sin categoría')
export const etiquetaEstadoBien = (v: string) => ESTADO_BIEN[v] ?? capitalizar(v)
