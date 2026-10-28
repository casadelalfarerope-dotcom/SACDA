// Tipos de eventos que cada hermano puede elegir recibir en Google Calendar.
export type TipoGoogle = 'cultos' | 'especiales' | 'ministerio' | 'turnos' | 'academia'
export const TIPOS_GOOGLE: { value: TipoGoogle; label: string; detalle: string }[] = [
  { value: 'cultos', label: 'Cultos', detalle: 'Los servicios de cada semana' },
  { value: 'especiales', label: 'Eventos especiales', detalle: 'Santa Cena, aniversarios y eventos de la iglesia' },
  { value: 'ministerio', label: 'Mis ministerios', detalle: 'Ensayos y reuniones de los ministerios donde estás' },
  { value: 'turnos', label: 'Mis turnos', detalle: 'Los días que te toca servir' },
  { value: 'academia', label: 'Academia', detalle: 'Las clases de los cursos donde estás inscrito' },
]
