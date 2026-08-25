'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

  const { data: invite, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email)
  if (inviteError) return { error: inviteError.message }

  const { error: cuentaError } = await admin
    .from('cuentas')
    .insert({ id: invite.user.id, persona_id: personaId })

  if (cuentaError) {
    // Revertir el usuario creado si falla la inserción
    await admin.auth.admin.deleteUser(invite.user.id)
    return { error: cuentaError.message }
  }

  revalidatePath(`/congregantes/${personaId}`)
  return { ok: true }
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

  await admin.auth.admin.deleteUser(cuenta.id)
  // La fila en cuentas se borra por CASCADE

  revalidatePath(`/congregantes/${personaId}`)
  return { ok: true }
}
