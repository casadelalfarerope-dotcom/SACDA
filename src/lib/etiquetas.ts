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

type VarianteEstado = 'warning' | 'info' | 'success' | 'error' | 'muted'
const ESTADO_TAREA: Record<string, { label: string; variant: VarianteEstado }> = {
  pendiente:   { label: 'Pendiente',   variant: 'warning' },
  en_progreso: { label: 'En progreso', variant: 'info' },
  entregado:   { label: 'Por revisar', variant: 'info' },
  aprobado:    { label: 'Aprobada',    variant: 'success' },
  rechazado:   { label: 'Rechazada',   variant: 'error' },
}
export const estadoTarea = (v: string) => ESTADO_TAREA[v] ?? { label: capitalizar(v), variant: 'muted' as const }

// Medio de pago: efectivo es físico; los demás son digitales.
export type Medio = 'efectivo' | 'yape' | 'plin' | 'transferencia' | 'tarjeta' | 'otro'
export const MEDIOS_DIGITALES: { value: Medio; label: string }[] = [
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
]
export const MEDIOS_VALIDOS: Medio[] = ['efectivo', ...MEDIOS_DIGITALES.map((m) => m.value)]
export const etiquetaMedio = (v: string | null | undefined) =>
  !v || v === 'efectivo' ? 'Efectivo' : MEDIOS_DIGITALES.find((m) => m.value === v)?.label ?? capitalizar(v)
export const esDigital = (v: string | null | undefined) => !!v && v !== 'efectivo'
