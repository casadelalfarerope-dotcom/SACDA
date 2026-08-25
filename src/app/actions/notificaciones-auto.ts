'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { enviarEmail, tplCumpleanios } from '@/lib/email'
import { diasParaCumpleanios } from '@/lib/utils'

const DIAS_AVISO_CUMPLE = 7

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

  // Obtener diseñadores para notificar
  const { data: rolDiseno } = await admin.from('roles').select('id').eq('nombre', 'diseniador').maybeSingle()

  const diseñadores: { persona_id: string; email: string | null; nombre: string }[] = []
  if (rolDiseno) {
    const { data: asignados } = await admin
      .from('roles_asignados')
      .select('persona_id, persona:personas(email, nombre_completo)')
      .eq('rol_id', rolDiseno.id)
      .eq('activo', true)

    for (const ra of asignados ?? []) {
      const p = ra.persona as unknown as { email: string | null; nombre_completo: string } | null
      if (p) diseñadores.push({ persona_id: ra.persona_id, email: p.email, nombre: p.nombre_completo })
    }
  }

  let enviados = 0

  for (const persona of pendientes) {
    // Notificación in-app a cada diseñador
    for (const d of diseñadores) {
      await admin.from('notificaciones').insert({
        persona_id: d.persona_id,
        tipo: 'cumpleanios_proximo',
        titulo: `Cumpleaños de ${persona.nombre_completo.split(' ')[0]}`,
        cuerpo: `${persona.nombre_completo} cumple años ${persona.dias === 0 ? 'hoy' : persona.dias === 1 ? 'mañana' : `en ${persona.dias} días`}. Prepara el arte.`,
        url: `/congregantes/${persona.id}`,
      })

      // Email
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
