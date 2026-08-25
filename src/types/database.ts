export type EstadoPersona = 'activo' | 'inactivo' | 'visita'
export type TipoCeremonia = 'bautismo' | 'dedicacion' | 'boda'
export type EstadoSeguimiento = 'pendiente' | 'contactado' | 'regular' | 'inactivo'
export type EstadoAusencia = 'pendiente' | 'contactado' | 'resuelto'
export type AccionAuditoria = 'insert' | 'update' | 'delete'
export type CanalNotificacion = 'in_app' | 'correo' | 'whatsapp'

export interface Persona {
  id: string
  nombre_completo: string
  dni: string | null
  fecha_nacimiento: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  ministerio: string | null
  estado: EstadoPersona
  foto_url: string | null
  notas: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Cuenta {
  id: string
  persona_id: string
  activa: boolean
  created_at: string
}

export interface Rol {
  id: string
  nombre: string
  descripcion: string | null
  created_at: string
}

export interface RolAsignado {
  id: string
  persona_id: string
  rol_id: string
  asignado_por: string | null
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  created_at: string
  rol?: Rol
  persona?: Persona
}

export interface PermisoModulo {
  id: string
  rol_id: string
  modulo: string
  puede_ver: boolean
  puede_crear: boolean
  puede_editar: boolean
  puede_eliminar: boolean
}

export interface PreferenciasNotificacion {
  id: string
  persona_id: string
  canal_por_defecto: CanalNotificacion
  config: Record<string, string>
  created_at: string
  updated_at: string
}

export interface Ceremonia {
  id: string
  tipo: TipoCeremonia
  fecha: string
  descripcion: string | null
  officiante: string | null
  created_by: string | null
  created_at: string
  ceremonia_personas?: CeremoniasPersona[]
}

export interface CeremoniasPersona {
  id: string
  ceremonia_id: string
  persona_id: string | null
  nombre_externo: string | null
  rol_en_ceremonia: string
  persona?: Persona
}

export interface SeguimientoVisita {
  id: string
  persona_id: string
  fecha_primera_visita: string
  referido_por: string | null
  seguimiento_por: string | null
  volvio: boolean
  estado: EstadoSeguimiento
  notas: string | null
  created_at: string
  updated_at: string
  persona?: Persona
  referido?: Persona
  encargado?: Persona
}

export interface Ausencia {
  id: string
  persona_id: string
  fecha: string
  motivo: string | null
  seguimiento_por: string | null
  estado: EstadoAusencia
  created_by: string | null
  created_at: string
  updated_at: string
  persona?: Persona
  encargado?: Persona
}

export interface Auditoria {
  id: string
  tabla_afectada: string
  registro_id: string
  accion: AccionAuditoria
  datos_antes: Record<string, unknown> | null
  datos_despues: Record<string, unknown> | null
  realizado_por: string | null
  created_at: string
}

// Tipo de base de datos para el cliente Supabase tipado
export interface Database {
  public: {
    Tables: {
      personas: { Row: Persona; Insert: Omit<Persona, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Persona, 'id'>> }
      cuentas: { Row: Cuenta; Insert: Omit<Cuenta, 'created_at'>; Update: Partial<Cuenta> }
      roles: { Row: Rol; Insert: Omit<Rol, 'id' | 'created_at'>; Update: Partial<Omit<Rol, 'id'>> }
      roles_asignados: { Row: RolAsignado; Insert: Omit<RolAsignado, 'id' | 'created_at'>; Update: Partial<Omit<RolAsignado, 'id'>> }
      permisos_modulo: { Row: PermisoModulo; Insert: Omit<PermisoModulo, 'id'>; Update: Partial<Omit<PermisoModulo, 'id'>> }
      preferencias_notificacion: { Row: PreferenciasNotificacion; Insert: Omit<PreferenciasNotificacion, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<PreferenciasNotificacion, 'id'>> }
      ceremonias: { Row: Ceremonia; Insert: Omit<Ceremonia, 'id' | 'created_at'>; Update: Partial<Omit<Ceremonia, 'id'>> }
      ceremonia_personas: { Row: CeremoniasPersona; Insert: Omit<CeremoniasPersona, 'id'>; Update: Partial<Omit<CeremoniasPersona, 'id'>> }
      seguimiento_visitas: { Row: SeguimientoVisita; Insert: Omit<SeguimientoVisita, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<SeguimientoVisita, 'id'>> }
      ausencias: { Row: Ausencia; Insert: Omit<Ausencia, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Ausencia, 'id'>> }
      auditoria: { Row: Auditoria; Insert: Omit<Auditoria, 'id' | 'created_at'>; Update: never }
    }
  }
}
