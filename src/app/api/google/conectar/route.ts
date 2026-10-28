import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { googleConfigurado, urlAutorizacion } from '@/lib/google'

export const dynamic = 'force-dynamic'

// Administración conecta la cuenta de Google de la iglesia (una sola vez).
export async function GET(req: Request) {
  const volver = new URL('/configuracion', req.url)
  const supabase = await createClient()
  const { data: permitido } = await supabase.rpc('tiene_permiso', { p_modulo: 'roles', p_accion: 'editar' })
  if (permitido !== true) return NextResponse.redirect(`${volver}?google=sin-permiso`)
  if (!googleConfigurado()) return NextResponse.redirect(`${volver}?google=sin-claves`)

  const estado = randomBytes(16).toString('hex')
  const res = NextResponse.redirect(urlAutorizacion(estado, new URL(req.url).origin))
  res.cookies.set('google_estado', estado, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' })
  return res
}
