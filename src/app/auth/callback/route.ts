import { NextResponse, type NextRequest } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

function destinoSeguro(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/entrar'
}

// Devuelve el error a mostrar en /login, o null si el usuario tiene acceso.
async function vincularCuenta(user: User): Promise<string | null> {
  const admin = createServiceClient()

  let { data: cuenta } = await admin
    .from('cuentas')
    .select('id, activa, persona_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!cuenta && user.email) {
    // Invitado por correo que entra con Google: Supabase puede crear un usuario
    // distinto al invitado; se traslada la cuenta de la persona al nuevo usuario.
    const { data: persona } = await admin
      .from('personas')
      .select('id, cuentas(id, activa)')
      .ilike('email', user.email.replace(/[%_\\]/g, '\\$&'))
      .maybeSingle()

    const previa = (persona?.cuentas as unknown as { id: string; activa: boolean }[] | null)?.[0]
      ?? (persona?.cuentas as unknown as { id: string; activa: boolean } | null)

    if (persona && previa?.id && previa.id !== user.id) {
      if (!previa.activa) return 'inactiva'
      await admin.auth.admin.deleteUser(previa.id)
      await admin.from('cuentas').insert({ id: user.id, persona_id: persona.id })
      cuenta = { id: user.id, activa: true, persona_id: persona.id }
    }
  }

  if (!cuenta) {
    // Correo no invitado: no se deja el usuario creado en auth.
    await admin.auth.admin.deleteUser(user.id)
    return 'sin_acceso'
  }
  if (!cuenta.activa) return 'inactiva'

  const avatar = user.user_metadata?.avatar_url as string | undefined
  if (avatar) {
    await admin
      .from('personas')
      .update({ foto_url: avatar })
      .eq('id', cuenta.persona_id)
      .is('foto_url', null)
  }

  return null
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = destinoSeguro(searchParams.get('next'))

  if (!code) return NextResponse.redirect(`${origin}/login?error=enlace`)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=enlace`)

  const errorAcceso = await vincularCuenta(data.user)
  if (errorAcceso) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=${errorAcceso}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
