import { createHash } from 'crypto'
import { after } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generarInstancias, type EventoBase } from '@/lib/calendario'
import { integrantesDe } from '@/lib/agenda'
import type { TipoGoogle } from '@/lib/google-tipos'
import { Google, ZONA, accesoDesdeRefresh, appUrl, conexion, googleConfigurado } from '@/lib/google'

// Envía a Google Calendar lo que sale en el calendario del sistema:
// cada día de cada evento es un evento en el calendario de la iglesia, con
// invitados según lo que cada hermano eligió en su configuración.
// Es idempotente: compara con lo ya enviado (google_sync) y solo crea,
// actualiza o borra lo que cambió.

const DIAS_ADELANTE = 60
const DURACION_MIN = 120 // si no hay hora de fin

interface Deseado {
  clave: string
  fecha: string
  meet: boolean
  cuerpo: Record<string, unknown>
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date())

function sumarMin(hora: string, min: number) {
  const [h, m] = hora.slice(0, 5).split(':').map(Number)
  const t = Math.min(h! * 60 + m! + min, 23 * 60 + 59)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

function cuando(fecha: string, inicio: string | null, fin: string | null) {
  if (!inicio) {
    const sig = new Date(fecha + 'T12:00:00'); sig.setDate(sig.getDate() + 1)
    return { start: { date: fecha }, end: { date: ymd(sig) } }
  }
  const hi = inicio.slice(0, 5)
  const hf = fin && fin.slice(0, 5) > hi ? fin.slice(0, 5) : sumarMin(hi, DURACION_MIN)
  return {
    start: { dateTime: `${fecha}T${hi}:00`, timeZone: ZONA },
    end: { dateTime: `${fecha}T${hf}:00`, timeZone: ZONA },
  }
}

function descripcion(partes: (string | null | undefined)[], ruta: string) {
  return [...partes.filter(Boolean), `Ver en SACDA: ${appUrl()}${ruta}`].join('\n\n')
}

const huella = (d: Deseado) => createHash('sha1').update(JSON.stringify([d.cuerpo, d.meet])).digest('hex')

type Prefs = Map<string, { correo: string; tipos: Set<string> }>

async function calcular(admin: SupabaseClient, prefs: Prefs): Promise<Deseado[]> {
  const hoy = hoyLima()
  const desde = new Date(hoy + 'T00:00:00')
  const hasta = new Date(desde); hasta.setDate(hasta.getDate() + DIAS_ADELANTE)
  const hastaStr = ymd(hasta)
  const correos = (ids: Iterable<string>, tipo: TipoGoogle) => {
    const set = new Set<string>()
    for (const id of ids) { const p = prefs.get(id); if (p?.tipos.has(tipo)) set.add(p.correo.toLowerCase()) }
    return [...set].sort().map((email) => ({ email }))
  }
  const todos = [...prefs.keys()]
  const salida: Deseado[] = []

  // 1. Eventos del calendario (de la iglesia y de los ministerios)
  const [{ data: eventos }, { data: excepciones }] = await Promise.all([
    admin.from('eventos').select('*').eq('sincronizar_google', true),
    admin.from('evento_excepciones').select('evento_id, fecha_original, tipo_excepcion, fecha_nueva, titulo_override, hora_nueva_inicio'),
  ])
  const integrantes = new Map<string, string[]>()
  for (const ev of eventos ?? []) {
    const grupo = ev.grupo_id as string | null
    let invitados: { email: string }[]
    if (grupo) {
      if (!integrantes.has(grupo)) integrantes.set(grupo, (await integrantesDe(admin, grupo)).map((p) => p.id))
      invitados = correos(integrantes.get(grupo)!, 'ministerio')
    } else {
      invitados = correos(todos, ev.tipo === 'servicio' ? 'cultos' : 'especiales')
    }
    if (!invitados.length) continue
    const exc = (excepciones ?? []).filter((x) => x.evento_id === ev.id)
    for (const inst of generarInstancias(ev as EventoBase, exc, desde, hasta)) {
      const fecha = ymd(inst.fecha)
      const virtual = ev.modalidad !== 'presencial'
      const enlace = virtual ? (ev.enlace_reunion as string | null) : null
      salida.push({
        clave: `ev:${ev.id}:${inst.fecha_original}`,
        fecha,
        meet: virtual && !!ev.crear_meet && !enlace,
        cuerpo: {
          summary: inst.titulo,
          location: (ev.lugar as string | null) ?? enlace ?? undefined,
          description: descripcion([ev.descripcion, enlace && `Enlace de la reunión: ${enlace}`],
            grupo ? `/mi/ministerios/${grupo}/agenda` : `/mi/calendario?dia=${fecha}`),
          ...cuando(fecha, inst.hora_inicio, inst.excepcion || inst.hora_inicio !== ev.hora_inicio ? null : ev.hora_fin),
          attendees: invitados,
        },
      })
    }
  }

  // 2. Turnos de servicio publicados
  const { data: turnos } = await admin.from('programa_asignaciones')
    .select('id, persona_id, puesto:roles_servicio(nombre, grupo:grupos(id, nombre, encargado_id)), programa:programas!inner(titulo, fecha, hora_inicio, cancelado, programa_ministerios(grupo_id, estado))')
    .gte('programa.fecha', hoy).lte('programa.fecha', hastaStr).eq('programa.cancelado', false)
  for (const t of turnos ?? []) {
    const puesto = t.puesto as unknown as { nombre: string; grupo: { id: string; nombre: string; encargado_id: string | null } | null } | null
    const prog = t.programa as unknown as { titulo: string; fecha: string; hora_inicio: string | null; programa_ministerios: { grupo_id: string; estado: string }[] }
    if (!puesto?.grupo) continue
    const publicado = prog.programa_ministerios.some((m) => m.grupo_id === puesto.grupo!.id && m.estado === 'publicado')
    if (!publicado) continue
    const invitados = correos([t.persona_id as string], 'turnos')
    if (!invitados.length) continue
    salida.push({
      clave: `tu:${t.id}`, fecha: prog.fecha, meet: false,
      cuerpo: {
        summary: `Sirves: ${puesto.nombre} — ${prog.titulo}`,
        description: descripcion([`Ministerio: ${puesto.grupo.nombre}`], '/mi/servicio'),
        ...cuando(prog.fecha, prog.hora_inicio, null),
        attendees: invitados,
      },
    })
  }

  // 3. Clases de la Academia
  const { data: sesiones } = await admin.from('sesiones')
    .select('id, fecha, hora_inicio, hora_fin, enlace_reunion, tema:temas(titulo, curso:cursos(id, nombre, estado, profesor_id))')
    .gte('fecha', hoy).lte('fecha', hastaStr)
  const inscritos = new Map<string, string[]>()
  for (const s of sesiones ?? []) {
    const tema = s.tema as unknown as { titulo: string; curso: { id: string; nombre: string; estado: string; profesor_id: string | null } | null } | null
    const curso = tema?.curso
    if (!curso || curso.estado === 'borrador') continue
    if (!inscritos.has(curso.id)) {
      const { data } = await admin.from('curso_inscripciones').select('persona_id').eq('curso_id', curso.id).eq('activo', true)
      inscritos.set(curso.id, [...(data ?? []).map((i) => i.persona_id as string), ...(curso.profesor_id ? [curso.profesor_id] : [])])
    }
    const invitados = correos(inscritos.get(curso.id)!, 'academia')
    if (!invitados.length) continue
    const enlace = s.enlace_reunion as string | null
    salida.push({
      clave: `se:${s.id}`, fecha: s.fecha as string, meet: false,
      cuerpo: {
        summary: `${curso.nombre}: ${tema!.titulo}`,
        location: enlace ?? undefined,
        description: descripcion([enlace && `Enlace de la clase: ${enlace}`], `/taller/sesiones/${s.id}`),
        ...cuando(s.fecha as string, s.hora_inicio as string | null, s.hora_fin as string | null),
        attendees: invitados,
      },
    })
  }
  return salida
}

async function ejecutar(admin: SupabaseClient) {
  const con = await conexion(admin)
  if (!con) return
  const g = new Google(await accesoDesdeRefresh(con.refresh_token))

  // Calendario propio "Casa del Alfarero" dentro de la cuenta de la iglesia.
  let cal = con.calendario_id
  if (!cal || !(await g.pedir('GET', `/calendars/${encodeURIComponent(cal)}`))) {
    const nuevo = await g.pedir<{ id: string }>('POST', '/calendars', { summary: 'Casa del Alfarero', timeZone: ZONA })
    cal = nuevo!.id
    await admin.from('google_conexion').update({ calendario_id: cal }).eq('id', 1)
    await admin.from('google_sync').delete().neq('clave', '')
  }
  const base = `/calendars/${encodeURIComponent(cal)}/events`

  const { data: filasPref } = await admin.from('google_preferencias').select('persona_id, correo, tipos').eq('activo', true)
  const prefs: Prefs = new Map((filasPref ?? []).filter((p) => p.correo)
    .map((p) => [p.persona_id as string, { correo: p.correo as string, tipos: new Set(p.tipos as string[]) }]))

  const deseados = await calcular(admin, prefs)
  const hoy = hoyLima()
  const { data: enviados } = await admin.from('google_sync').select('clave, google_event_id, huella').gte('fecha', hoy)
  const previos = new Map((enviados ?? []).map((e) => [e.clave as string, e]))
  const claves = new Set(deseados.map((d) => d.clave))

  const tareas: (() => Promise<void>)[] = []
  for (const d of deseados) {
    const h = huella(d)
    const previo = previos.get(d.clave)
    if (previo?.huella === h) continue
    tareas.push(async () => {
      let ev: { id: string; hangoutLink?: string } | null = null
      if (previo) ev = await g.pedir('PATCH', `${base}/${previo.google_event_id}?sendUpdates=none&conferenceDataVersion=1`, d.cuerpo)
      if (!ev) {
        const cuerpo = d.meet
          ? { ...d.cuerpo, conferenceData: { createRequest: { requestId: h.slice(0, 20), conferenceSolutionKey: { type: 'hangoutsMeet' } } } }
          : d.cuerpo
        ev = await g.pedir('POST', `${base}?sendUpdates=none&conferenceDataVersion=1`, cuerpo)
      }
      if (!ev) return
      await admin.from('google_sync').upsert({
        clave: d.clave, google_event_id: ev.id, fecha: d.fecha, huella: h,
        enlace_meet: ev.hangoutLink ?? null, updated_at: new Date().toISOString(),
      })
    })
  }
  // Lo que ya no corresponde (evento borrado, cancelado o sin invitados) se borra de Google.
  for (const [clave, previo] of previos) {
    if (claves.has(clave)) continue
    tareas.push(async () => {
      await g.pedir('DELETE', `${base}/${previo.google_event_id}?sendUpdates=none`)
      await admin.from('google_sync').delete().eq('clave', clave)
    })
  }
  // De a 5 en paralelo para no pasar el límite de Google.
  for (let i = 0; i < tareas.length; i += 5) await Promise.all(tareas.slice(i, i + 5).map((t) => t()))
}

// Punto de entrada. Si ya hay una sincronización en curso, la marca como
// pendiente para que esa misma la repita al terminar.
export async function sincronizarGoogle(admin: SupabaseClient) {
  if (!googleConfigurado()) return
  const ahora = new Date()
  const vencido = new Date(ahora.getTime() - 3 * 60_000).toISOString()
  const { data: tomado } = await admin.from('google_conexion')
    .update({ bloqueo: ahora.toISOString(), pendiente: false })
    .eq('id', 1).or(`bloqueo.is.null,bloqueo.lt.${vencido}`).select('id')
  if (!tomado?.length) {
    await admin.from('google_conexion').update({ pendiente: true }).eq('id', 1)
    return
  }
  try {
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      await ejecutar(admin)
      const { data } = await admin.from('google_conexion').update({ pendiente: false }).eq('id', 1).eq('pendiente', true).select('id')
      if (!data?.length) break
    }
    await admin.from('google_conexion').update({ ultima_sync: new Date().toISOString(), ultimo_error: null }).eq('id', 1)
  } catch (e) {
    await admin.from('google_conexion').update({ ultimo_error: String((e as Error).message ?? e).slice(0, 500) }).eq('id', 1)
  } finally {
    await admin.from('google_conexion').update({ bloqueo: null }).eq('id', 1)
  }
}

// Para llamar después de un cambio en el calendario: sincroniza en segundo
// plano, sin hacer esperar a quien guardó.
export function programarSyncGoogle() {
  if (!googleConfigurado()) return
  after(() => sincronizarGoogle(createServiceClient()))
}
