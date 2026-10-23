'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { enviarEmail, tplInvitacion } from '@/lib/email'

export async function invitarPersona(personaId: string, email: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const admin = createServiceClient()

  const { data: existing } = await admin
    .from('cuentas')
    .select('id')
    .eq('persona_id', personaId)
    .maybeSingle()

  if (existing) return { error: 'Esta persona ya tiene acceso al sistema' }

  // La app genera el enlace y envía el correo (la plantilla de Supabase no se puede
  // cambiar sin un servidor de correo propio). El enlace usa token_hash: la cuenta
  // se activa cuando la persona pulsa un botón, así el antivirus del correo no lo gasta.
  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { data: generado, error: inviteError } = await admin.auth.admin.generateLink({
    type: 'invite', email, options: { redirectTo: `${origin}/auth/invitacion` },
  })
  if (inviteError || !generado.user) {
    return { error: inviteError?.message.includes('already') ? 'Ese correo ya tiene una cuenta en el sistema.' : 'No se pudo crear la invitación.' }
  }

  // Con el correo en la ficha, el login con Google puede reconocer a la persona.
  await admin.from('personas').update({ email }).eq('id', personaId).is('email', null)

  const { error: cuentaError } = await admin
    .from('cuentas')
    .insert({ id: generado.user.id, persona_id: personaId })

  if (cuentaError) {
    // Revertir el usuario creado si falla la inserción
    await admin.auth.admin.deleteUser(generado.user.id)
    return { error: cuentaError.message }
  }

  const enlace = `${origin}/auth/invitacion?token_hash=${generado.properties.hashed_token}&type=invite&email=${encodeURIComponent(email)}`
  const { data: persona } = await admin.from('personas').select('nombre_completo').eq('id', personaId).single()
  const { subject, html } = tplInvitacion(persona?.nombre_completo ?? '', enlace)
  const envio = await enviarEmail(email, subject, html)

  revalidatePath(`/congregantes/${personaId}`)
  return { ok: true, enlace, correoEnviado: envio.ok }
}

export async function revocarAcceso(personaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  const admin = createServiceClient()

  const { data: cuenta } = await admin
    .from('cuentas')
    .select('id')
    .eq('persona_id', personaId)
    .maybeSingle()

  if (!cuenta) return { error: 'Esta persona no tiene cuenta activa' }

  const { error } = await admin.auth.admin.deleteUser(cuenta.id)
  // La fila en cuentas se borra por CASCADE
  if (error) return { error: 'No se pudo revocar el acceso. Inténtalo de nuevo o avisa al administrador.' }

  revalidatePath(`/congregantes/${personaId}`)
  return { ok: true }
}
