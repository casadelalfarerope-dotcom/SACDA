'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { KeyRound, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { IconoApp } from '@/components/ui/IconoApp'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  )
}

// Formas en que puede llegar la invitación:
// · ?token_hash=…&type=invite (plantilla recomendada): la cuenta se activa
//   recién cuando la persona pulsa un botón, así los antivirus del correo que
//   abren los enlaces no la gastan antes.
// · #access_token=… (plantilla por defecto de Supabase): ya trae la sesión.
// Luego la persona elige cómo entrará: con Google o con una contraseña.
export default function InvitacionPage() {
  const [estado, setEstado] = useState<'cargando' | 'error' | 'elegir'>('cargando')
  const [email, setEmail] = useState<string | null>(null)
  const [tokenHash, setTokenHash] = useState<string | null>(null)
  const [conectando, setConectando] = useState(false)
  const [activando, setActivando] = useState(false)
  const [errorGoogle, setErrorGoogle] = useState('')
  const [errorClave, setErrorClave] = useState('')

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const th = query.get('token_hash')
    if (th) {
      setTokenHash(th)
      setEmail(query.get('email'))
      window.history.replaceState(null, '', window.location.pathname)
      setEstado('elegir')
      return
    }
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')
    if (!access_token || !refresh_token) { setEstado('error'); return }

    createClient().auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
      if (error) { setEstado('error'); return }
      window.history.replaceState(null, '', window.location.pathname)
      setEmail(data.user?.email ?? null)
      setEstado('elegir')
    })
  }, [])

  // Con la plantilla de token_hash, la cuenta se activa al elegir la contraseña.
  async function crearContrasena() {
    if (!tokenHash) { window.location.href = '/cambiar-contrasena'; return }
    setActivando(true)
    setErrorClave('')
    const { error } = await createClient().auth.verifyOtp({ token_hash: tokenHash, type: 'invite' })
    if (error) {
      setErrorClave('Este enlace ya se usó o venció. Entra con Google o pide que te inviten de nuevo.')
      setActivando(false)
      return
    }
    window.location.href = '/cambiar-contrasena'
  }

  async function continuarConGoogle() {
    setConectando(true)
    setErrorGoogle('')
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: email ? { login_hint: email } : undefined },
    })
    if (error) {
      setErrorGoogle('No se pudo conectar con Google. Inténtalo de nuevo o crea una contraseña.')
      setConectando(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--background)' }}>
      <div className="w-full max-w-sm">
        {estado === 'cargando' && (
          <p role="status" className="text-center text-sm" style={{ color: 'var(--muted)' }}>Activando tu cuenta…</p>
        )}

        {estado === 'error' && (
          <div className="space-y-5 text-center">
            <IconoApp tamano={56} className="mx-auto" />
            <h1 className="text-[22px] font-bold" style={{ color: 'var(--foreground)' }}>Este enlace ya no funciona</h1>
            <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
              Los enlaces de invitación sirven una sola vez; a veces el propio correo los abre al revisarlos.
              Tu cuenta igual está creada: si tu correo es de Google, entra directamente.
            </p>
            <button type="button" onClick={continuarConGoogle} disabled={conectando}
              className="w-full h-12 flex items-center justify-center gap-3 rounded-full text-[15px] font-semibold border disabled:opacity-60"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              {conectando ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
              Continuar con Google
            </button>
            {errorGoogle && <p role="alert" className="text-[13px]" style={{ color: 'var(--error)' }}>{errorGoogle}</p>}
            <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
              ¿Tu correo no es de Google? Ve a <Link href="/recuperar" className="underline" style={{ color: 'var(--accent)' }}>¿Olvidaste tu contraseña?</Link> para crear una, o pide que te inviten de nuevo.
            </p>
          </div>
        )}

        {estado === 'elegir' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center gap-3">
              <IconoApp tamano={56} />
              <h1 className="text-[26px] font-bold" style={{ color: 'var(--foreground)' }}>¡Bienvenido!</h1>
              <p className="text-[15px]" style={{ color: 'var(--muted)' }}>
                Tu cuenta{email ? <> para <b style={{ color: 'var(--foreground)' }}>{email}</b></> : null} está lista.
                Elige cómo quieres entrar de ahora en adelante:
              </p>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={continuarConGoogle} disabled={conectando}
                className="w-full h-12 flex items-center justify-center gap-3 rounded-full text-[15px] font-semibold border disabled:opacity-60"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                {conectando ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
                Continuar con Google
              </button>
              <p className="text-[13px] text-center px-2" style={{ color: 'var(--muted)' }}>
                Sin contraseña nueva: entras con tu cuenta de Google{email ? ' de este mismo correo' : ''}.
              </p>
              {errorGoogle && <p role="alert" className="text-[13px] text-center" style={{ color: 'var(--error)' }}>{errorGoogle}</p>}
            </div>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-[13px]" style={{ color: 'var(--muted)' }}>o</span>
              <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            <div className="space-y-3">
              <button type="button" onClick={crearContrasena} disabled={activando}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-60"
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}>
                {activando ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} aria-hidden="true" />} Crear una contraseña
              </button>
              {errorClave && <p role="alert" className="text-[13px] text-center" style={{ color: 'var(--error)' }}>{errorClave}</p>}
              <p className="text-[13px] text-center px-2" style={{ color: 'var(--muted)' }}>
                Entras con tu correo y la contraseña que elijas. Úsalo si tu correo no es de Google.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
