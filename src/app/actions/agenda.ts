'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { integrantesDe } from '@/lib/agenda'
import { programarSyncGoogle } from '@/lib/google-sync'
import { limpiarModalidad, modalidadBD, type DatosModalidad } from '@/lib/modalidad'

const FECHA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^\d{2}:\d{2}$/
const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

function refrescar(grupoId: string) {
  programarSyncGoogle()
  revalidatePath('/mi', 'layout')
  revalidatePath('/calendario')
  revalidatePath(`/mi/ministerios/${grupoId}`, 'layout')
}

// Quién está actuando y si puede gestionar la agenda del ministerio:
// sus líderes y ayudantes, el líder del ministerio padre, o Administración/Coordinación.
async function gestor(grupoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const [{ data: cuenta }, { data: lider }, { data: admin }] = await Promise.all([
    supabase.from('cuentas').select('persona_id').eq('id', user.id).single(),
    supabase.rpc('es_gestor_de', { p_grupo: grupoId }),
    supabase.rpc('tiene_permiso', { p_modulo: 'ministerios', p_accion: 'editar' }),
  ])
  if (lider !== true && admin !== true) return null
  return { personaId: (cuenta?.persona_id as string | undefined) ?? null }
}

async function grupoDeEvento(eventoId: string) {
  const { data } = await createServiceClient().from('eventos').select('grupo_id').eq('id', eventoId).maybeSingle()
  return (data?.grupo_id as string | null) ?? null
}

export async function crearEventoMinisterio(datos: {
  grupo_id: string
  titulo: string
  descripcion?: string
  lugar?: string
  hora_inicio?: string
  hora_fin?: string
  repetir: boolean
  fecha?: string            // si no se repite
  dias_semana?: string[]    // si se repite cada semana
  desde?: string
  hasta?: string
  requiere_asistencia: boolean
  modalidad?: string
  enlace_reunion?: string
  crear_meet?: boolean
}) {
  const titulo = datos.titulo.trim()
  if (titulo.length < 3) return { error: 'Escribe un título (por ejemplo: “Ensayo de la banda”).' }
  if (datos.hora_inicio && !HORA.test(datos.hora_inicio)) return { error: 'La hora no es válida.' }
  if (datos.hora_fin && !HORA.test(datos.hora_fin)) return { error: 'La hora de fin no es válida.' }
  if (datos.repetir) {
    const dias = (datos.dias_semana ?? []).filter((d) => DIAS.includes(d))
    if (!dias.length) return { error: 'Elige qué días de la semana se repite.' }
    if (!FECHA.test(datos.desde ?? '')) return { error: 'Elige desde qué fecha empieza.' }
    if (datos.hasta && (!FECHA.test(datos.hasta) || datos.hasta < datos.desde!)) return { error: 'La fecha de término debe ser después del inicio.' }
  } else if (!FECHA.test(datos.fecha ?? '')) return { error: 'Elige la fecha.' }

  const mod = limpiarModalidad(datos as Partial<DatosModalidad>)
  if (mod.error) return { error: mod.error }

  const quien = await gestor(datos.grupo_id)
  if (!quien) return { error: 'Solo el líder del ministerio puede crear sus eventos.' }

  const admin = createServiceClient()
  const { data: evento, error } = await admin.from('eventos').insert({
    titulo, descripcion: datos.descripcion?.trim() || null, lugar: datos.lugar?.trim() || null,
    tipo: datos.repetir ? 'actividad_especial' : 'evento_unico',
    hora_inicio: datos.hora_inicio || null, hora_fin: datos.hora_fin || null,
    grupo_id: datos.grupo_id, created_by: quien.personaId,
    tipo_recurrencia: datos.repetir ? 'semanal' : 'ninguna',
    dias_semana: datos.repetir ? datos.dias_semana : null,
    fecha_inicio_serie: datos.repetir ? datos.desde : null,
    fecha_fin_serie: datos.repetir ? datos.hasta || null : null,
    fecha_unica: datos.repetir ? null : datos.fecha,
    requiere_asistencia: datos.requiere_asistencia,
    ...modalidadBD(mod.datos!),
  }).select('id').single()
  if (error || !evento) return { error: 'No se pudo crear el evento.' }

  // Aviso a los integrantes del ministerio (menos a quien lo creó).
  const [{ data: grupo }, integrantes] = await Promise.all([
    admin.from('grupos').select('nombre').eq('id', datos.grupo_id).single(),
    integrantesDe(admin, datos.grupo_id),
  ])
  const cuando = datos.repetir
    ? `Cada ${(datos.dias_semana ?? []).map((d) => d.replace('miercoles', 'miércoles').replace('sabado', 'sábado')).join(', ')}`
    : `El ${datos.fecha!.slice(8, 10)}/${datos.fecha!.slice(5, 7)}`
  const avisos = integrantes.filter((p) => p.id !== quien.personaId).map((p) => ({
    persona_id: p.id, tipo: 'general', titulo: `${grupo?.nombre ?? 'Tu ministerio'}: ${titulo}`,
    cuerpo: `${cuando}${datos.hora_inicio ? ` a las ${datos.hora_inicio}` : ''}${datos.lugar ? ` · ${datos.lugar}` : ''}.`,
    url: `/mi/ministerios/${datos.grupo_id}/agenda`,
  }))
  if (avisos.length) await admin.from('notificaciones').insert(avisos)

  refrescar(datos.grupo_id)
  return { success: true }
}

// Cancelar una sola fecha (queda como excepción) o el evento completo.
export async function cancelarReunion(eventoId: string, fecha: string) {
  if (!FECHA.test(fecha)) return { error: 'Fecha no válida.' }
  const grupoId = await grupoDeEvento(eventoId)
  if (!grupoId || !(await gestor(grupoId))) return { error: 'No tienes permiso para cambiar este evento.' }
  const admin = createServiceClient()
  const { data: ev } = await admin.from('eventos').select('tipo_recurrencia').eq('id', eventoId).single()
  const { error } = ev?.tipo_recurrencia === 'ninguna'
    ? await admin.from('eventos').delete().eq('id', eventoId)
    : await admin.from('evento_excepciones').insert({ evento_id: eventoId, fecha_original: fecha, tipo_excepcion: 'cancelado' })
  if (error) return { error: 'No se pudo cancelar.' }
  refrescar(grupoId)
  return { success: true }
}

export async function eliminarEventoMinisterio(eventoId: string) {
  const grupoId = await grupoDeEvento(eventoId)
  if (!grupoId || !(await gestor(grupoId))) return { error: 'No tienes permiso para eliminar este evento.' }
  const { error } = await createServiceClient().from('eventos').delete().eq('id', eventoId)
  if (error) return { error: 'No se pudo eliminar.' }
  refrescar(grupoId)
  return { success: true }
}

// Marcar (o desmarcar) que un integrante vino a la reunión. Usa el cliente del
// usuario: la base de datos solo lo permite al líder o a Administración.
export async function marcarAsistenciaMinisterio(eventoId: string, fecha: string, personaId: string, vino: boolean) {
  if (!FECHA.test(fecha)) return { error: 'Fecha no válida.' }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tu sesión expiró.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()
  const { error: e1 } = await supabase.from('asistencia_ministerio_listas')
    .upsert({ evento_id: eventoId, fecha }, { onConflict: 'evento_id,fecha', ignoreDuplicates: true })
  if (e1) return { error: e1.code === '42501' ? 'Solo el líder puede pasar lista.' : 'No se pudo guardar.' }
  const { error } = vino
    ? await supabase.from('asistencia_ministerio').upsert(
      { evento_id: eventoId, fecha, persona_id: personaId, marcado_por: cuenta?.persona_id ?? null },
      { onConflict: 'evento_id,fecha,persona_id', ignoreDuplicates: true })
    : await supabase.from('asistencia_ministerio').delete().eq('evento_id', eventoId).eq('fecha', fecha).eq('persona_id', personaId)
  if (error) return { error: 'No se pudo guardar.' }
  const grupoId = await grupoDeEvento(eventoId)
  if (grupoId) revalidatePath(`/mi/ministerios/${grupoId}`, 'layout')
  return { success: true }
}
