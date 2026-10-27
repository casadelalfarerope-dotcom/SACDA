'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { enviarEmail, tplCumpleanios } from '@/lib/email'
import { diasParaCumpleanios, formatDate, hoyLima } from '@/lib/utils'
import { integrantesMinisterio } from '@/lib/ministerios'

const DIAS_AVISO_CUMPLE = 7

function sumarDias(fecha: string, dias: number) {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export async function procesarCumpleaniosProximos() {
  const admin = createServiceClient()
  const anioActual = new Date().getFullYear()

  // Personas activas con cumpleaños en los próximos DIAS_AVISO_CUMPLE días
  const { data: personas } = await admin
    .from('personas')
    .select('id, nombre_completo, fecha_nacimiento')
    .eq('estado', 'activo')
    .not('fecha_nacimiento', 'is', null)

  const proximosCumple = (personas ?? [])
    .map((p) => ({ ...p, dias: diasParaCumpleanios(p.fecha_nacimiento!) }))
    .filter((p) => p.dias >= 0 && p.dias <= DIAS_AVISO_CUMPLE)

  if (proximosCumple.length === 0) return { ok: true, enviados: 0 }

  // Ver cuáles ya tienen notificación enviada este año
  const ids = proximosCumple.map((p) => p.id)
  const { data: yaEnviadas } = await admin
    .from('notif_cumpleanios_enviadas')
    .select('persona_id')
    .in('persona_id', ids)
    .eq('anio', anioActual)

  const yaEnviadasSet = new Set((yaEnviadas ?? []).map((r) => r.persona_id))
  const pendientes = proximosCumple.filter((p) => !yaEnviadasSet.has(p.id))

  if (pendientes.length === 0) return { ok: true, enviados: 0 }

  // Cada cumpleaños genera una tarea de arte en Diseño Gráfico; su líder la
  // asigna. Se avisa al líder (o a todo el ministerio si no tiene líder).
  const { data: diseno } = await admin.from('grupos').select('id').eq('clave', 'diseno').maybeSingle()
  const integrantes = await integrantesMinisterio(admin, 'diseno')
  const avisar = integrantes.some((d) => d.esLider) ? integrantes.filter((d) => d.esLider) : integrantes
  const hoy = hoyLima()

  let enviados = 0

  for (const persona of pendientes) {
    const fechaCumple = sumarDias(hoy, persona.dias)
    const { data: tarea } = await admin.from('tareas').insert({
      tipo: 'diseno',
      grupo_id: diseno?.id ?? null,
      titulo: `Arte de cumpleaños: ${persona.nombre_completo}`,
      descripcion: `${persona.nombre_completo} cumple años el ${formatDate(fechaCumple)}. Prepara el saludo para pantalla y redes.`,
      fecha_limite: persona.dias > 0 ? sumarDias(hoy, persona.dias - 1) : hoy,
      estado: 'pendiente',
    }).select('id').single()

    for (const d of avisar) {
      await admin.from('notificaciones').insert({
        persona_id: d.persona_id,
        tipo: 'cumpleanios_proximo',
        titulo: `Cumpleaños de ${persona.nombre_completo.split(' ')[0]}`,
        cuerpo: `${persona.nombre_completo} cumple años ${persona.dias === 0 ? 'hoy' : persona.dias === 1 ? 'mañana' : `en ${persona.dias} días`}. Se creó la tarea del arte${d.esLider ? ': asígnala a alguien de tu ministerio' : ''}.`,
        url: tarea ? `/mi/tareas/${tarea.id}` : '/mi/ministerios',
      })
      if (d.email) {
        const { subject, html } = tplCumpleanios(persona.nombre_completo, persona.dias)
        await enviarEmail(d.email, subject, html)
      }
    }

    // Marcar como enviada para este año
    await admin.from('notif_cumpleanios_enviadas').upsert(
      { persona_id: persona.id, anio: anioActual },
      { onConflict: 'persona_id,anio' }
    )
    enviados++
  }

  return { ok: true, enviados }
}

// El día del cumpleaños se avisa a todos los hermanos con cuenta, para que
// lo saluden. Una sola vez por cumpleañero y año (el enlace del aviso lo marca).
export async function avisarCumpleaniosDeHoy() {
  const admin = createServiceClient()
  const hoy = hoyLima()
  const { data: personas } = await admin.from('personas').select('id, nombre_completo, fecha_nacimiento')
    .eq('estado', 'activo').not('fecha_nacimiento', 'is', null)
  const cumplen = (personas ?? []).filter((p) => diasParaCumpleanios(p.fecha_nacimiento!) === 0)
  if (!cumplen.length) return { ok: true, enviados: 0 }

  const { data: cuentas } = await admin.from('cuentas').select('persona_id').not('persona_id', 'is', null)
  const destinatarios = [...new Set((cuentas ?? []).map((c) => c.persona_id as string))]
  let enviados = 0
  for (const p of cumplen) {
    const url = `/mi/calendario?dia=${hoy}#cumple-${p.id}`
    const { count } = await admin.from('notificaciones').select('id', { count: 'exact', head: true }).eq('url', url)
    if (count) continue
    const nombre = p.nombre_completo.split(' ')[0]
    const filas = destinatarios.filter((id) => id !== p.id).map((persona_id) => ({
      persona_id, tipo: 'cumpleanios_proximo', titulo: `🎂 Hoy cumple años ${nombre}`,
      cuerpo: `${p.nombre_completo} está de cumpleaños hoy. ¡No olvides saludarle!`, url,
    }))
    if (filas.length) await admin.from('notificaciones').insert(filas)
    enviados++
  }
  return { ok: true, enviados }
}
