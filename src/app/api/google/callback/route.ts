import { NextResponse, after } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { canjearCodigo, correoDeIdToken } from '@/lib/google'
import { sincronizarGoogle } from '@/lib/google-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Google vuelve aquí tras autorizar: se guarda la conexión y se sincroniza.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const volver = new URL('/configuracion', req.url)
  const estado = (await cookies()).get('google_estado')?.value
  if (!estado || estado !== url.searchParams.get('state')) return NextResponse.redirect(`${volver}?google=caducado`)
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(`${volver}?google=cancelado`)

  const supabase = await createClient()
  const { data: permitido } = await supabase.rpc('tiene_permiso', { p_modulo: 'roles', p_accion: 'editar' })
  if (permitido !== true) return NextResponse.redirect(`${volver}?google=sin-permiso`)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: cuenta } = await supabase.from('cuentas').select('persona_id').eq('id', user!.id).single()

  try {
    const t = await canjearCodigo(code, new URL(req.url).origin)
    if (!t.refresh_token) return NextResponse.redirect(`${volver}?google=sin-refresh`)
    const admin = createServiceClient()
    await admin.from('google_conexion').upsert({
      id: 1, correo: correoDeIdToken(t.id_token) ?? 'cuenta de Google', refresh_token: t.refresh_token,
      calendario_id: null, conectado_por: cuenta?.persona_id ?? null, ultimo_error: null, bloqueo: null, pendiente: false,
    })
    await admin.from('google_sync').delete().neq('clave', '')
    after(() => sincronizarGoogle(admin))
  } catch (e) {
    console.error('[google] conexión fallida:', e)
    return NextResponse.redirect(`${volver}?google=error&motivo=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 150) : '')}`)
  }
  const res = NextResponse.redirect(`${volver}?google=conectado`)
  res.cookies.delete('google_estado')
  return res
}
