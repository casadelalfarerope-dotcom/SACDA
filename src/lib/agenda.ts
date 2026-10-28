import type { SupabaseClient } from '@supabase/supabase-js'
import { generarInstancias, type EventoBase, type ExcepcionBase } from '@/lib/calendario'

export interface Reunion {
  evento_id: string
  grupo_id: string | null
  fecha: string            // fecha original de la serie (clave de la lista)
  fecha_real: string       // día en que se realiza (si se movió)
  titulo: string
  hora: string | null
  hora_fin: string | null
  lugar: string | null
  requiere_asistencia: boolean
  recurrente: boolean
  modalidad: string
  enlace: string | null   // para entrar si es virtual (pegado o Meet generado)
}

const CAMPOS = 'id, titulo, tipo, hora_inicio, hora_fin, lugar, grupo_id, requiere_asistencia, tipo_recurrencia, fecha_unica, fecha_inicio_serie, fecha_fin_serie, dias_semana, semana_del_mes, dia_semana_mes, modalidad, enlace_reunion, crear_meet'

// Fechas de los eventos (de ministerios o de la iglesia) entre dos días, sin los
// cancelados. grupoIds: solo esos ministerios; 'iglesia': solo los generales.
export async function reuniones(db: SupabaseClient, filtro: { grupoIds: string[] } | 'iglesia', desde: string, hasta: string): Promise<Reunion[]> {
  let q = db.from('eventos').select(CAMPOS)
  if (filtro === 'iglesia') q = q.is('grupo_id', null)
  else if (filtro.grupoIds.length) q = q.in('grupo_id', filtro.grupoIds)
  else return []
  const { data: eventos } = await q
  if (!eventos?.length) return []
  const { data: excepciones } = await db.from('evento_excepciones')
    .select('evento_id, fecha_original, tipo_excepcion, fecha_nueva, titulo_override, hora_nueva_inicio')
    .in('evento_id', eventos.map((e) => e.id))
  const d = new Date(desde + 'T12:00:00Z'), h = new Date(hasta + 'T12:00:00Z')
  const lista = eventos.flatMap((e) =>
    generarInstancias(e as EventoBase, ((excepciones ?? []) as (ExcepcionBase & { evento_id: string })[]).filter((x) => x.evento_id === e.id), d, h)
      .map((i) => ({
        evento_id: e.id as string, grupo_id: e.grupo_id as string | null, fecha: i.fecha_original,
        fecha_real: i.fecha.toISOString().slice(0, 10), titulo: i.titulo, hora: i.hora_inicio,
        hora_fin: e.hora_fin as string | null, lugar: i.lugar, requiere_asistencia: !!e.requiere_asistencia,
        recurrente: e.tipo_recurrencia !== 'ninguna',
        modalidad: (e.modalidad as string) ?? 'presencial',
        enlace: e.modalidad !== 'presencial' ? (e.enlace_reunion as string | null) : null,
        meet: e.modalidad !== 'presencial' && !e.enlace_reunion && !!e.crear_meet,
      })),
  ).sort((a, b) => (a.fecha_real + (a.hora ?? '')).localeCompare(b.fecha_real + (b.hora ?? '')))
  // Enlaces de Meet que generó Google Calendar.
  const conMeet = lista.filter((r) => r.meet)
  if (conMeet.length) {
    const { data } = await db.from('google_sync').select('clave, enlace_meet').in('clave', conMeet.map((r) => `ev:${r.evento_id}:${r.fecha}`))
    const meet = new Map((data ?? []).map((x) => [x.clave as string, x.enlace_meet as string | null]))
    for (const r of conMeet) r.enlace = meet.get(`ev:${r.evento_id}:${r.fecha}`) ?? null
  }
  return lista.map(({ meet: _meet, ...r }) => r)
}

export type RolGrupo = 'lider' | 'ayudante' | null

// Integrantes del ministerio (con sus líderes y ayudantes), ordenados por nombre.
export async function integrantesDe(db: SupabaseClient, grupoId: string) {
  const [{ data: miembros }, { data: grupo }] = await Promise.all([
    db.from('grupo_miembros').select('rol_en_grupo, persona:personas(id, nombre_completo, foto_url)').eq('grupo_id', grupoId).eq('activo', true),
    db.from('grupos').select('encargado_id, lider:personas!grupos_encargado_id_fkey(id, nombre_completo, foto_url)').eq('id', grupoId).single(),
  ])
  type P = { id: string; nombre_completo: string; foto_url: string | null; rol: RolGrupo }
  const lista: P[] = (miembros ?? []).filter((m) => m.persona).map((m) => ({
    ...(m.persona as unknown as Omit<P, 'rol'>),
    rol: (m.rol_en_grupo === 'lider' || m.rol_en_grupo === 'ayudante' ? m.rol_en_grupo : null) as RolGrupo,
  }))
  const lider = grupo?.lider as unknown as Omit<P, 'rol'> | null
  if (lider && !lista.some((p) => p.id === lider.id)) lista.push({ ...lider, rol: 'lider' })
  for (const p of lista) if (p.id === grupo?.encargado_id) p.rol = 'lider'
  return lista.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
}

export const DIAS_SEMANA = [
  { valor: 'lunes', texto: 'Lun' }, { valor: 'martes', texto: 'Mar' }, { valor: 'miercoles', texto: 'Mié' },
  { valor: 'jueves', texto: 'Jue' }, { valor: 'viernes', texto: 'Vie' }, { valor: 'sabado', texto: 'Sáb' }, { valor: 'domingo', texto: 'Dom' },
]
