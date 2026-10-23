import type { SupabaseClient } from '@supabase/supabase-js'
import { generarInstancias, type EventoBase, type ExcepcionBase } from '@/lib/calendario'
import { hoyLima } from '@/lib/utils'

export const DIAS_PROGRAMACION = 90

function sumarDias(fecha: string, dias: number) {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

// Crea (o corrige) un programa por cada culto de los próximos 3 meses según
// el calendario y sus excepciones. Es idempotente: se puede llamar en cada
// visita. Usa el cliente de servicio.
export async function asegurarProgramas(admin: SupabaseClient) {
  const hoy = hoyLima()
  const hasta = sumarDias(hoy, DIAS_PROGRAMACION)

  const { data: eventos } = await admin.from('eventos')
    .select('id, titulo, tipo, hora_inicio, hora_fin, lugar, tipo_recurrencia, fecha_unica, fecha_inicio_serie, fecha_fin_serie, dias_semana, semana_del_mes, dia_semana_mes')
    .eq('tipo', 'servicio')
  if (!eventos?.length) return

  const ids = eventos.map((e) => e.id as string)
  const [{ data: excepciones }, { data: existentes }] = await Promise.all([
    admin.from('evento_excepciones').select('evento_id, fecha_original, tipo_excepcion, fecha_nueva, titulo_override').in('evento_id', ids),
    admin.from('programas').select('id, evento_id, fecha_original, fecha, titulo, hora_inicio, cancelado')
      .in('evento_id', ids).gte('fecha_original', hoy).lte('fecha_original', hasta),
  ])

  const desde = new Date(hoy + 'T12:00:00Z')
  const fin = new Date(hasta + 'T12:00:00Z')
  const instancias = eventos.flatMap((e) => {
    const fechaFin = e.fecha_fin_serie as string | null
    return generarInstancias(e as EventoBase, ((excepciones ?? []) as (ExcepcionBase & { evento_id: string })[])
      .filter((x) => x.evento_id === e.id), desde, fechaFin && fechaFin < hasta ? new Date(fechaFin + 'T12:00:00Z') : fin)
  }).filter((i) => i.fecha_original >= hoy)

  const clave = (eventoId: string, fecha: string) => `${eventoId}|${fecha}`
  const porClave = new Map((existentes ?? []).map((p) => [clave(p.evento_id as string, p.fecha_original as string), p]))
  const vigentes = new Set<string>()

  const nuevos = []
  for (const i of instancias) {
    const k = clave(i.evento_id, i.fecha_original)
    vigentes.add(k)
    const fecha = i.fecha.toISOString().slice(0, 10)
    const hora = i.hora_inicio
    const actual = porClave.get(k)
    if (!actual) {
      nuevos.push({ evento_id: i.evento_id, fecha_original: i.fecha_original, fecha, titulo: i.titulo, hora_inicio: hora, estado: 'borrador' })
    } else if (actual.fecha !== fecha || actual.titulo !== i.titulo || actual.cancelado || (actual.hora_inicio ?? null) !== (hora ?? null)) {
      await admin.from('programas').update({ fecha, titulo: i.titulo, hora_inicio: hora, cancelado: false }).eq('id', actual.id)
    }
  }
  if (nuevos.length) await admin.from('programas').insert(nuevos)

  // Cultos cancelados: si nadie fue asignado se borra; si no, queda marcado.
  for (const p of existentes ?? []) {
    if (vigentes.has(clave(p.evento_id as string, p.fecha_original as string)) || p.cancelado) continue
    const { count } = await admin.from('programa_asignaciones').select('id', { count: 'exact', head: true }).eq('programa_id', p.id)
    if (count) await admin.from('programas').update({ cancelado: true }).eq('id', p.id)
    else await admin.from('programas').delete().eq('id', p.id)
  }
}

export interface Sugerencia { puesto_id: string; persona_id: string }

// Sugiere quién ocupa cada puesto vacío de un ministerio en un programa:
// · fijo: los mismos del último culto en que se llenó ese puesto;
// · rotativo: los siguientes en la lista de candidatos (o de integrantes)
//   después del último que sirvió.
export async function sugerirMinisterio(db: SupabaseClient, programaId: string, grupoId: string): Promise<Sugerencia[]> {
  const [{ data: programa }, { data: puestos }, { data: grupo }, { data: miembros }] = await Promise.all([
    db.from('programas').select('id, fecha').eq('id', programaId).single(),
    db.from('roles_servicio').select('id, cantidad, modo').eq('grupo_id', grupoId).eq('activo', true).order('orden'),
    db.from('grupos').select('encargado_id').eq('id', grupoId).single(),
    db.from('grupo_miembros').select('persona_id, persona:personas(nombre_completo)').eq('grupo_id', grupoId).eq('activo', true),
  ])
  if (!programa || !puestos?.length) return []
  const puestoIds = puestos.map((p) => p.id as string)

  const [{ data: candidatos }, { data: actuales }, { data: historial }] = await Promise.all([
    db.from('puesto_candidatos').select('puesto_id, persona_id, orden').in('puesto_id', puestoIds).order('orden'),
    db.from('programa_asignaciones').select('rol_servicio_id, persona_id').eq('programa_id', programaId),
    db.from('programa_asignaciones')
      .select('rol_servicio_id, persona_id, programa:programas!inner(id, fecha, cancelado)')
      .in('rol_servicio_id', puestoIds).lt('programa.fecha', programa.fecha).eq('programa.cancelado', false)
      .limit(500),
  ])

  // Integrantes ordenados por nombre (el líder también puede servir).
  const integrantes = (miembros ?? [])
    .map((m) => ({ id: m.persona_id as string, nombre: (m.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '' }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre)).map((m) => m.id)
  if (grupo?.encargado_id && !integrantes.includes(grupo.encargado_id)) integrantes.push(grupo.encargado_id)

  const ocupados = new Set((actuales ?? []).map((a) => a.persona_id as string))
  const hist = (historial ?? []).map((h) => ({ ...h, fecha: (h.programa as unknown as { fecha: string; id: string }).fecha, pid: (h.programa as unknown as { id: string }).id }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))

  const sugerencias: Sugerencia[] = []
  for (const puesto of puestos) {
    const ya = (actuales ?? []).filter((a) => a.rol_servicio_id === puesto.id).length
    let faltan = (puesto.cantidad as number) - ya
    if (faltan <= 0) continue

    const pasados = hist.filter((h) => h.rol_servicio_id === puesto.id)
    const pool = (candidatos ?? []).filter((c) => c.puesto_id === puesto.id).map((c) => c.persona_id as string)
    const lista = pool.length ? pool : integrantes

    let orden: string[]
    if (puesto.modo === 'fijo' && pasados.length) {
      const ultimo = pasados[0]!.pid
      orden = [...pasados.filter((h) => h.pid === ultimo).map((h) => h.persona_id as string), ...lista]
    } else {
      // Empieza después del último que sirvió en este puesto.
      const ultimaPersona = pasados[0]?.persona_id as string | undefined
      const idx = ultimaPersona ? lista.indexOf(ultimaPersona) : -1
      orden = [...lista.slice(idx + 1), ...lista.slice(0, idx + 1)]
    }

    for (const personaId of [...new Set(orden)]) {
      if (faltan <= 0) break
      if (ocupados.has(personaId)) continue
      sugerencias.push({ puesto_id: puesto.id as string, persona_id: personaId })
      ocupados.add(personaId)
      faltan--
    }
  }
  return sugerencias
}

export interface MinisterioDelPrograma {
  grupo: { id: string; nombre: string; encargado_id: string | null }
  estado: 'vacio' | 'borrador' | 'publicado'
  puestos: {
    id: string; nombre: string; cantidad: number; modo: 'fijo' | 'rotativo'; requiere_material: boolean
    asignados: { id: string; persona_id: string; nombre: string; material_url: string | null }[]
  }[]
  integrantes: { id: string; nombre: string }[]
}

// Datos de un programa agrupados por ministerio (solo ministerios con puestos).
// Si se pasa grupoIds, se limita a esos ministerios.
export async function cargarPrograma(db: SupabaseClient, programaId: string, grupoIds?: string[]): Promise<MinisterioDelPrograma[]> {
  let qPuestos = db.from('roles_servicio')
    .select('id, nombre, cantidad, modo, requiere_material, orden, grupo:grupos!inner(id, nombre, encargado_id, activo)')
    .eq('activo', true).not('grupo_id', 'is', null).order('orden')
  if (grupoIds) qPuestos = qPuestos.in('grupo_id', grupoIds)

  const [{ data: puestos }, { data: asignaciones }, { data: estados }] = await Promise.all([
    qPuestos,
    db.from('programa_asignaciones').select('id, rol_servicio_id, persona_id, material_url, persona:personas(nombre_completo)').eq('programa_id', programaId),
    db.from('programa_ministerios').select('grupo_id, estado').eq('programa_id', programaId),
  ])

  const grupos = new Map<string, MinisterioDelPrograma>()
  for (const p of puestos ?? []) {
    const g = p.grupo as unknown as { id: string; nombre: string; encargado_id: string | null; activo: boolean }
    if (!g.activo) continue
    if (!grupos.has(g.id)) grupos.set(g.id, { grupo: { id: g.id, nombre: g.nombre, encargado_id: g.encargado_id }, estado: 'vacio', puestos: [], integrantes: [] })
    grupos.get(g.id)!.puestos.push({
      id: p.id, nombre: p.nombre, cantidad: p.cantidad, modo: p.modo, requiere_material: p.requiere_material,
      asignados: (asignaciones ?? []).filter((a) => a.rol_servicio_id === p.id).map((a) => ({
        id: a.id, persona_id: a.persona_id, material_url: a.material_url,
        nombre: (a.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '—',
      })),
    })
  }
  if (!grupos.size) return []

  const { data: miembros } = await db.from('grupo_miembros')
    .select('grupo_id, persona_id, persona:personas(nombre_completo)').in('grupo_id', [...grupos.keys()]).eq('activo', true)
  const lideres = [...grupos.values()].map((m) => m.grupo.encargado_id).filter(Boolean) as string[]
  const { data: personasLider } = lideres.length
    ? await db.from('personas').select('id, nombre_completo').in('id', lideres)
    : { data: [] }

  for (const m of grupos.values()) {
    const lista = (miembros ?? []).filter((x) => x.grupo_id === m.grupo.id).map((x) => ({
      id: x.persona_id as string, nombre: (x.persona as unknown as { nombre_completo: string } | null)?.nombre_completo ?? '—',
    }))
    const lider = (personasLider ?? []).find((p) => p.id === m.grupo.encargado_id)
    if (lider && !lista.some((x) => x.id === lider.id)) lista.push({ id: lider.id, nombre: lider.nombre_completo })
    m.integrantes = lista.sort((a, b) => a.nombre.localeCompare(b.nombre))
    const est = (estados ?? []).find((e) => e.grupo_id === m.grupo.id)?.estado
    m.estado = est === 'publicado' ? 'publicado' : m.puestos.some((p) => p.asignados.length) ? 'borrador' : 'vacio'
  }
  return [...grupos.values()].sort((a, b) => a.grupo.nombre.localeCompare(b.grupo.nombre))
}

export interface Turno {
  id: string
  programa_id: string
  material_url: string | null
  estado_material: string
  puesto: { nombre: string; requiere_material: boolean }
  grupo: { id: string; nombre: string }
  programa: { titulo: string; fecha: string; hora_inicio: string | null }
  publicado: boolean
}

// Turnos de una persona. Un turno se muestra cuando su ministerio publicó su
// parte del programa (o si la persona es el líder de ese ministerio).
export async function misTurnos(db: SupabaseClient, personaId: string): Promise<Turno[]> {
  const { data } = await db.from('programa_asignaciones')
    .select('id, programa_id, material_url, estado_material, puesto:roles_servicio(nombre, requiere_material, grupo:grupos(id, nombre, encargado_id)), programa:programas!inner(titulo, fecha, hora_inicio, cancelado, programa_ministerios(grupo_id, estado))')
    .eq('persona_id', personaId).eq('programa.cancelado', false)

  return (data ?? []).flatMap((a) => {
    const puesto = a.puesto as unknown as { nombre: string; requiere_material: boolean; grupo: { id: string; nombre: string; encargado_id: string | null } | null } | null
    const prog = a.programa as unknown as { titulo: string; fecha: string; hora_inicio: string | null; programa_ministerios: { grupo_id: string; estado: string }[] }
    if (!puesto?.grupo) return []
    const publicado = prog.programa_ministerios.some((m) => m.grupo_id === puesto.grupo!.id && m.estado === 'publicado')
    if (!publicado && puesto.grupo.encargado_id !== personaId) return []
    return [{
      id: a.id, programa_id: a.programa_id, material_url: a.material_url, estado_material: a.estado_material,
      puesto: { nombre: puesto.nombre, requiere_material: puesto.requiere_material },
      grupo: { id: puesto.grupo.id, nombre: puesto.grupo.nombre },
      programa: { titulo: prog.titulo, fecha: prog.fecha, hora_inicio: prog.hora_inicio },
      publicado,
    }]
  }).sort((x, y) => x.programa.fecha.localeCompare(y.programa.fecha))
}

// Repite en este culto a las personas del culto anterior del ministerio
// (solo en los puestos que siguen vacíos).
export async function asignacionesAnteriores(db: SupabaseClient, programaId: string, grupoId: string): Promise<Sugerencia[]> {
  const [{ data: programa }, { data: puestos }] = await Promise.all([
    db.from('programas').select('fecha').eq('id', programaId).single(),
    db.from('roles_servicio').select('id, cantidad').eq('grupo_id', grupoId).eq('activo', true),
  ])
  if (!programa || !puestos?.length) return []
  const puestoIds = puestos.map((p) => p.id as string)
  const [{ data: actuales }, { data: previas }] = await Promise.all([
    db.from('programa_asignaciones').select('rol_servicio_id, persona_id').eq('programa_id', programaId),
    db.from('programa_asignaciones').select('rol_servicio_id, persona_id, programa:programas!inner(id, fecha, cancelado)')
      .in('rol_servicio_id', puestoIds).lt('programa.fecha', programa.fecha).eq('programa.cancelado', false).limit(300),
  ])
  const lista = (previas ?? []).map((p) => ({ ...p, prog: p.programa as unknown as { id: string; fecha: string } }))
    .sort((a, b) => b.prog.fecha.localeCompare(a.prog.fecha))
  const ultimo = lista[0]?.prog.id
  if (!ultimo) return []
  const ocupados = new Set((actuales ?? []).map((a) => `${a.rol_servicio_id}|${a.persona_id}`))
  return lista.filter((p) => p.prog.id === ultimo)
    .filter((p) => !ocupados.has(`${p.rol_servicio_id}|${p.persona_id}`))
    .filter((p) => {
      const cupo = (puestos.find((x) => x.id === p.rol_servicio_id)?.cantidad as number) ?? 1
      return (actuales ?? []).filter((a) => a.rol_servicio_id === p.rol_servicio_id).length < cupo
    })
    .map((p) => ({ puesto_id: p.rol_servicio_id as string, persona_id: p.persona_id as string }))
}
