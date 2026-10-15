import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Enlaces de invitación y recuperación de contraseña (plantillas de correo de Supabase).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')
  const destino = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  if (!tokenHash || !type) return NextResponse.redirect(`${origin}/login?error=enlace`)

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) return NextResponse.redirect(`${origin}/login?error=enlace`)

  return NextResponse.redirect(`${origin}${destino}`)
}
