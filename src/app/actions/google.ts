'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { programarSyncGoogle, sincronizarGoogle } from '@/lib/google-sync'
import { TIPOS_GOOGLE } from '@/lib/google-tipos'

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Cada hermano elige si quiere los eventos en su Google Calendar y cuáles.
export async function guardarPreferenciasGoogle(datos: { activo: boolean; correo: string; tipos: string[] }) {
  const correo = datos.correo.trim().toLowerCase()
  const tipos = datos.tipos.filter((t) => TIPOS_GOOGLE.some((x) => x.value === t))
  if (datos.activo && !CORREO.test(correo)) return { error: 'Escribe el correo de tu cuenta de Google.' }
  if (datos.activo && !tipos.length) return { error: 'Elige al menos un tipo de evento.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user.id).single()
  if (!cuenta) return { error: 'Tu cuenta no tiene ficha.' }

  const { error } = await supabase.from('google_preferencias').upsert({
    persona_id: cuenta.persona_id, activo: datos.activo, correo: correo || null, tipos, updated_at: new Date().toISOString(),
  })
  if (error) return { error: 'No se pudo guardar.' }
  programarSyncGoogle()
  revalidatePath('/mi/perfil')
  revalidatePath('/configuracion')
  return { success: true }
}

async function esAdmin() {
  const supabase = await createClient()
  const { data } = await supabase.rpc('tiene_permiso', { p_modulo: 'roles', p_accion: 'editar' })
  return data === true
}

export async function sincronizarGoogleAhora() {
  if (!(await esAdmin())) return { error: 'No tienes permiso.' }
  const admin = createServiceClient()
  await sincronizarGoogle(admin)
  const { data } = await admin.from('google_conexion').select('ultimo_error').eq('id', 1).maybeSingle()
  revalidatePath('/configuracion')
  return data?.ultimo_error ? { error: data.ultimo_error as string } : { success: true }
}

// Quita la conexión. Los eventos ya enviados quedan en Google hasta que se
// borre el calendario "Casa del Alfarero" desde esa cuenta.
export async function desconectarGoogle() {
  if (!(await esAdmin())) return { error: 'No tienes permiso.' }
  const admin = createServiceClient()
  await admin.from('google_conexion').delete().eq('id', 1)
  await admin.from('google_sync').delete().neq('clave', '')
  revalidatePath('/configuracion')
  return { success: true }
}

// Administración activa Google Calendar para todos los hermanos activos que
// tienen correo en su ficha. No toca a quien ya eligió algo (activó o desactivó).
export async function activarGoogleParaTodos() {
  if (!(await esAdmin())) return { error: 'No tienes permiso.' }
  const admin = createServiceClient()
  const [{ data: personas }, { data: existentes }] = await Promise.all([
    admin.from('personas').select('id, email').eq('estado', 'activo').not('email', 'is', null),
    admin.from('google_preferencias').select('persona_id'),
  ])
  const ya = new Set((existentes ?? []).map((p) => p.persona_id as string))
  const nuevas = (personas ?? [])
    .filter((p) => !ya.has(p.id as string) && CORREO.test(((p.email as string) ?? '').trim()))
    .map((p) => ({ persona_id: p.id as string, activo: true, correo: (p.email as string).trim().toLowerCase(), tipos: TIPOS_GOOGLE.map((t) => t.value) }))
  if (nuevas.length) {
    const { error } = await admin.from('google_preferencias').insert(nuevas)
    if (error) return { error: 'No se pudo activar.' }
    programarSyncGoogle()
  }
  revalidatePath('/configuracion')
  return { success: true, activados: nuevas.length, yaElegidos: ya.size }
}
